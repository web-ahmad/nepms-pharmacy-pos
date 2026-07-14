from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging
from fastapi import HTTPException
from models.sales import Sale, SaleItem, CustomerPayment, SaleReturn, CustomerLedger, SaleReturnItem
from models.inventory import Batch, StockMovement, Medicine
from models.crm import Customer
from schemas.sales import CheckoutRequest, SaleReturnRequest, SaleReturnCreateRequest
from services.inventory_service import InventoryService
from repositories.sales import sale_repo

logger = logging.getLogger(__name__)

class SalesService:
    @staticmethod
    def calculate_loyalty_points(amount: float) -> int:
        return int(amount // 10)

    @staticmethod
    def checkout(db: Session, checkout_in: CheckoutRequest, tenant_id: str, branch_id: str, user_id: str) -> Sale:
        """
        Atomic checkout flow: Cart -> Stock Validation -> FEFO Allocation -> Payment -> Invoice -> Stock Deduction
        """
        try:
            if not branch_id:
                from models.users import Branch
                branch = db.query(Branch).filter(Branch.tenant_id == tenant_id).first()
                if branch:
                    branch_id = branch.id
                else:
                    branch = db.query(Branch).first()
                    if branch:
                        branch_id = branch.id

            from core.config import settings
            from services.settings_service import SettingsService

            workflow_mode = settings.POS_WORKFLOW_MODE
            try:
                db_settings = SettingsService(db).get_settings(tenant_id)
                if db_settings and db_settings.pos_settings and db_settings.pos_settings.get("workflow_mode"):
                    workflow_mode = db_settings.pos_settings.get("workflow_mode")
            except Exception:
                pass

            # Generate sequential invoice_num
            # Fetch all existing invoice numbers for the tenant
            existing_invoices = db.query(Sale.invoice_number).filter(
                Sale.tenant_id == tenant_id,
                Sale.invoice_number.like('INV-%')
            ).all()
            
            max_num = 0
            for (inv_num,) in existing_invoices:
                try:
                    num_part = inv_num.replace('INV-', '').strip()
                    # Only consider purely numeric parts to avoid legacy HEX strings messing up the sequence
                    if num_part.isdigit():
                        max_num = max(max_num, int(num_part))
                except Exception:
                    pass
            
            next_seq = max_num + 1
            invoice_num = f"INV-{next_seq:02d}"
            total_amount = sum([(i.quantity * i.unit_price) - i.discount for i in checkout_in.items]) + checkout_in.tax_amount + checkout_in.adjustment_amount
            
            # Enforce strict payment validation for Single Counter mode
            if workflow_mode == "SINGLE_COUNTER" and not checkout_in.hold_sale:
                if not checkout_in.customer_id and checkout_in.amount_paid < total_amount:
                    raise HTTPException(status_code=400, detail="Partial payment is not allowed for walking customers.")

            if checkout_in.hold_sale:
                status = "Held"
            elif workflow_mode == "DUAL_COUNTER":
                status = "Pending Verification"
            elif checkout_in.amount_paid < total_amount:
                status = "Partially Paid"
            else:
                status = "Completed"
            
            # 1. Create Sale Header
            sale = Sale(
                invoice_number=invoice_num,
                branch_id=branch_id,
                tenant_id=tenant_id,
                customer_id=checkout_in.customer_id,
                cashier_id=user_id,
                sale_date=datetime.utcnow(),
                subtotal=sum([i.quantity * i.unit_price for i in checkout_in.items]),
                discount_amount=checkout_in.discount_amount,
                tax_amount=checkout_in.tax_amount,
                adjustment_amount=checkout_in.adjustment_amount,
                total_amount=total_amount,
                payment_method=checkout_in.payment_method,
                amount_paid=checkout_in.amount_paid if status != "Pending Verification" else 0.0,
                status=status
            )
            sale.change_due = max(0.0, sale.amount_paid - sale.total_amount)
            db.add(sale)
            db.flush() # get sale.id
            
            # 2. Iterate items, deduct stock using FEFO, create SaleItems
            for item in checkout_in.items:
                if not checkout_in.hold_sale and status != "Pending Verification":
                    # Allocate using existing InventoryService FEFO
                    allocations = InventoryService.allocate_fefo(
                        db=db, 
                        tenant_id=tenant_id, 
                        branch_id=branch_id, 
                        medicine_id=item.medicine_id, 
                        quantity_required=item.quantity, 
                        user_id=user_id, 
                        reference_id=sale.id, 
                        movement_type="Sale",
                        preferred_batch_id=item.batch_id
                    )
                    
                    # Create SaleItem records per batch allocated
                    for alloc in allocations:
                        sale_item = SaleItem(
                            sale_id=sale.id,
                            medicine_id=item.medicine_id,
                            batch_id=alloc["batch_id"],
                            tenant_id=tenant_id,
                            quantity=alloc["quantity_taken"],
                            unit_price=item.unit_price,
                            discount=item.discount * (alloc["quantity_taken"]/item.quantity), # Pro-rate discount
                            total=(alloc["quantity_taken"] * item.unit_price) - (item.discount * (alloc["quantity_taken"]/item.quantity))
                        )
                        db.add(sale_item)
                else:
                    # Held Sale or Pending Verification: No batch allocation, just save the intent
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        medicine_id=item.medicine_id,
                        batch_id=item.batch_id,
                        tenant_id=tenant_id,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        discount=item.discount,
                        total=(item.quantity * item.unit_price) - item.discount
                    )
                    db.add(sale_item)
            
            # 3. Handle Loyalty and Customer Ledger (if not Held/Pending Verification)
            if not checkout_in.hold_sale and status != "Pending Verification" and checkout_in.customer_id:
                customer = db.query(Customer).filter(Customer.id == checkout_in.customer_id).first()
                if customer:
                    # Loyalty Points
                    points_earned = SalesService.calculate_loyalty_points(sale.total_amount)
                    customer.loyalty_points += points_earned
                    
                    # Credit System Handling
                    if checkout_in.payment_method == "Credit" or sale.amount_paid < sale.total_amount:
                        debt_added = sale.total_amount - sale.amount_paid
                        customer.current_balance += debt_added
                        
                        ledger_debit = CustomerLedger(
                            customer_id=customer.id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            transaction_date=datetime.utcnow(),
                            transaction_type="Sale (Credit)",
                            reference_id=sale.invoice_number,
                            debit=debt_added,
                            credit=0.0,
                            balance_after=customer.current_balance,
                            notes=f"Credit sale for {invoice_num}"
                        )
                        db.add(ledger_debit)
                    db.add(customer)

            # ── Auto-Posting (Accounting Engine) ────────────────────────
            if not checkout_in.hold_sale and status != "Pending Verification":
                from services.auto_posting_service import AutoPostingService
                auto_post = AutoPostingService(db)
                je = None
                if checkout_in.payment_method == "Credit" or sale.amount_paid < sale.total_amount:
                    if sale.amount_paid >= sale.total_amount:
                        je = auto_post.post_cash_sale(tenant_id, user_id, invoice_num, sale.total_amount, checkout_in.payment_method)
                    else:
                        je = auto_post.post_credit_sale(tenant_id, user_id, invoice_num, sale.total_amount)
                        if sale.amount_paid > 0:
                            auto_post.post_customer_payment(tenant_id, user_id, f"PAY-{invoice_num}", sale.amount_paid)
                else:
                    je = auto_post.post_cash_sale(tenant_id, user_id, invoice_num, sale.total_amount, checkout_in.payment_method)
                
                if je:
                    sale.journal_entry_id = je.id

                # Post COGS
                total_cost = 0.0
                for item in checkout_in.items:
                    med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
                    if med and med.cost_per_base_unit:
                        total_cost += item.quantity * med.cost_per_base_unit
                
                if total_cost > 0:
                    auto_post.post_cogs(tenant_id, user_id, invoice_num, total_cost)

            db.commit()
            db.refresh(sale)
            return sale
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def verify_complete_sale(db: Session, sale_id: str, amount_paid: float, payment_method: str, tenant_id: str, branch_id: str, user_id: str) -> Sale:
        """
        Completes a pending verification sale: allocates stock using FEFO, updates payment info,
        updates status, and records ledger entries.
        """
        try:
            query = db.query(Sale).filter(
                Sale.id == sale_id,
                Sale.tenant_id == tenant_id,
                Sale.is_deleted == False
            )
            if branch_id:
                query = query.filter(Sale.branch_id == branch_id)
            sale = query.first()
            if not sale:
                raise HTTPException(status_code=404, detail="Sale not found or access denied")
            
            if sale.status != "Pending Verification":
                raise HTTPException(status_code=400, detail=f"Cannot verify a sale with status: {sale.status}")
            
            total_amount = sale.total_amount
            
            # Enforce strict payment validation
            if not sale.customer_id and amount_paid < total_amount:
                raise HTTPException(status_code=400, detail="Partial payment is not allowed for walking customers.")
            
            # Determine status
            if amount_paid < total_amount:
                status = "Partially Paid"
            else:
                status = "Completed"
            
            # Fetch current placeholder items
            placeholder_items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
            
            # Delete placeholders so we can insert allocated items
            db.query(SaleItem).filter(SaleItem.sale_id == sale.id).delete()
            db.flush()
            
            # Perform FEFO allocation and create real SaleItem records
            for placeholder in placeholder_items:
                allocations = InventoryService.allocate_fefo(
                    db=db,
                    tenant_id=tenant_id,
                    branch_id=branch_id,
                    medicine_id=placeholder.medicine_id,
                    quantity_required=placeholder.quantity,
                    user_id=user_id,
                    reference_id=sale.id,
                    movement_type="Sale"
                )
                
                # Create SaleItem per batch
                for alloc in allocations:
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        medicine_id=placeholder.medicine_id,
                        batch_id=alloc["batch_id"],
                        tenant_id=tenant_id,
                        quantity=alloc["quantity_taken"],
                        unit_price=placeholder.unit_price,
                        discount=placeholder.discount * (alloc["quantity_taken"] / placeholder.quantity),
                        total=(alloc["quantity_taken"] * placeholder.unit_price) - (placeholder.discount * (alloc["quantity_taken"] / placeholder.quantity))
                    )
                    db.add(sale_item)
            
            # Update Sale Header
            sale.status = status
            sale.amount_paid = amount_paid
            sale.payment_method = payment_method
            sale.change_due = max(0.0, amount_paid - total_amount)
            sale.cashier_id = user_id
            
            # Handle Loyalty and Customer Ledger
            if sale.customer_id:
                customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
                if customer:
                    # Loyalty Points
                    points_earned = SalesService.calculate_loyalty_points(sale.total_amount)
                    customer.loyalty_points += points_earned
                    
                    # Credit System Handling
                    if payment_method == "Credit" or sale.amount_paid < sale.total_amount:
                        debt_added = sale.total_amount - sale.amount_paid
                        customer.current_balance += debt_added
                        
                        ledger_debit = CustomerLedger(
                            customer_id=customer.id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            transaction_date=datetime.utcnow(),
                            transaction_type="Sale (Credit)",
                            reference_id=sale.invoice_number,
                            debit=debt_added,
                            credit=0.0,
                            balance_after=customer.current_balance,
                            notes=f"Credit sale verification for {sale.invoice_number}"
                        )
                        db.add(ledger_debit)
                    db.add(customer)
            
            # ── Cash Register: inject SALE ledger entry ─────────────────
            try:
                from services.cashier_service import CashierService
                CashierService.inject_sale_entry(
                    db=db,
                    user_id=user_id,
                    branch_id=branch_id,
                    tenant_id=tenant_id,
                    sale_id=sale.id,
                    amount=sale.total_amount,
                    payment_mode=payment_method
                )
            except Exception:
                pass  # Never block a sale because of cashier ledger failure

            # ── Auto-Posting (Accounting Engine) ────────────────────────
            from services.auto_posting_service import AutoPostingService
            auto_post = AutoPostingService(db)
            je = None
            if payment_method == "Credit" or amount_paid < sale.total_amount:
                if amount_paid >= sale.total_amount:
                    je = auto_post.post_cash_sale(tenant_id, user_id, sale.invoice_number, sale.total_amount, payment_method)
                else:
                    je = auto_post.post_credit_sale(tenant_id, user_id, sale.invoice_number, sale.total_amount)
                    if amount_paid > 0:
                        auto_post.post_customer_payment(tenant_id, user_id, f"PAY-{sale.invoice_number}", amount_paid)
            else:
                je = auto_post.post_cash_sale(tenant_id, user_id, sale.invoice_number, sale.total_amount, payment_method)
            
            if je:
                sale.journal_entry_id = je.id

            # Post COGS
            total_cost = 0.0
            for placeholder in placeholder_items:
                med = db.query(Medicine).filter(Medicine.id == placeholder.medicine_id).first()
                if med and med.cost_per_base_unit:
                    total_cost += placeholder.quantity * med.cost_per_base_unit
            
            if total_cost > 0:
                auto_post.post_cogs(tenant_id, user_id, sale.invoice_number, total_cost)

            db.commit()
            db.refresh(sale)
            return sale
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def void_sale(
        db: Session,
        sale_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        void_reason: str = None,
        voided_by: str = None,
        webcam_image_base64: str = None,
        screenshot_base64: str = None
    ) -> Sale:
        try:
            query = db.query(Sale).filter(
                Sale.id == sale_id,
                Sale.tenant_id == tenant_id,
                Sale.is_deleted == False
            )
            if branch_id:
                query = query.filter(Sale.branch_id == branch_id)
            sale = query.first()
            if not sale:
                raise ValueError("Sale not found")
                

                
            if sale.status not in ["Completed", "Partially Paid", "Pending Verification"]:
                raise ValueError(f"Cannot void a sale with status: {sale.status}")
                
            # Iterate through sale items, revert stock
            for item in sale.items:
                if item.batch_id:
                    batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
                    if batch:
                        # Revert the full quantity originally sold
                        batch.current_quantity += item.quantity
                        db.add(batch)
                        
                        movement = StockMovement(
                            medicine_id=item.medicine_id,
                            batch_id=batch.id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            user_id=user_id,
                            movement_type="VOID_SALE",
                            quantity_change=item.quantity,
                            balance_after=batch.current_quantity,
                            reference_id=sale.id,
                            notes=f"Voided Sale {sale.invoice_number}"
                        )
                        db.add(movement)
            
            # Revert Customer Ledger if credit was given
            if sale.customer_id:
                customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
                if customer:
                    # Reverse loyalty points
                    points_earned = SalesService.calculate_loyalty_points(sale.total_amount)
                    customer.loyalty_points = max(0, customer.loyalty_points - points_earned)
                    
                    if sale.payment_method == "Credit" or sale.amount_paid < sale.total_amount:
                        debt_added = sale.total_amount - sale.amount_paid
                        customer.current_balance -= debt_added
                        
                        ledger_credit = CustomerLedger(
                            customer_id=customer.id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            transaction_date=datetime.utcnow(),
                            transaction_type="Voided Sale (Credit Reversal)",
                            reference_id=sale.invoice_number,
                            debit=0.0,
                            credit=debt_added,
                            balance_after=customer.current_balance,
                            notes=f"Voided sale {sale.invoice_number} reversal"
                        )
                        db.add(ledger_credit)
                    db.add(customer)
                    
            # Cash register void entry (use negative amount in inject_sale_entry if no void method)
            try:
                from services.cashier_service import CashierService
                CashierService.inject_sale_entry(
                    db=db,
                    user_id=user_id,
                    branch_id=branch_id,
                    tenant_id=tenant_id,
                    sale_id=sale.id,
                    amount=-sale.amount_paid,
                    payment_mode=sale.payment_method
                )
            except Exception:
                pass

            sale.status = "Voided"
            
            # Append Audit Note
            audit_note = f"[Voided by: {voided_by} on {datetime.utcnow().isoformat()}]"
            if void_reason:
                audit_note += f" Reason: {void_reason}"
            if sale.notes:
                sale.notes += f"\n{audit_note}"
            else:
                sale.notes = audit_note

            db.commit()
            db.refresh(sale)

            # ── Audit Event ────────────────────────────────────────────────
            # Write directly to the local SQLite audit_events table so the
            # background listener picks it up and fires the camera + WhatsApp.
            try:
                from models.audit import AuditEvent
                total_amount = float(sale.total_amount) if sale.total_amount else 0.0
                first_item = sale.items[0] if sale.items else None
                item_name = (
                    first_item.medicine.name
                    if (first_item and hasattr(first_item, 'medicine') and first_item.medicine)
                    else "Unknown Item"
                )
                audit_event = AuditEvent(
                    branch_id=str(branch_id),
                    staff_id=str(user_id),
                    event_type="void",
                    transaction_id=str(sale.id),
                    metadata_={
                        "staff_name": voided_by or "Unknown",
                        "item_name": item_name,
                        "amount": total_amount,
                        "reason": void_reason or "No reason provided",
                        "invoice_number": sale.invoice_number,
                    },
                    severity="medium",
                )
                db.add(audit_event)
                db.commit()
                logger.info(f"Audit event logged for void of sale {sale.id}")
            except Exception as audit_err:
                logger.warning(f"Failed to log audit event for void: {audit_err}")

            return sale
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def process_return(db: Session, return_in: SaleReturnRequest, tenant_id: str, branch_id: str, user_id: str):
        # Legacy fallback method
        try:
            sale = db.query(Sale).filter(Sale.id == return_in.sale_id).first()
            if not sale:
                raise ValueError("Sale not found")
                
            return_num = f"RET-{uuid.uuid4().hex[:6].upper()}"
            sale_return = SaleReturn(
                return_number=return_num,
                sale_id=sale.id,
                customer_id=sale.customer_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                return_date=datetime.utcnow(),
                total_amount=return_in.refund_amount,
                status="Completed"
            )
            db.add(sale_return)
            db.flush()
            
            # Restore stock
            for r_item in return_in.items:
                sale_item = db.query(SaleItem).filter(SaleItem.id == r_item.sale_item_id).first()
                if not sale_item:
                    raise ValueError(f"SaleItem {r_item.sale_item_id} not found")
                
                batch = db.query(Batch).filter(Batch.id == sale_item.batch_id).first()
                if batch:
                    batch.current_quantity += r_item.quantity_returned
                    db.add(batch)
                    
                    movement = StockMovement(
                        medicine_id=sale_item.medicine_id,
                        batch_id=batch.id,
                        branch_id=branch_id,
                        tenant_id=tenant_id,
                        user_id=user_id,
                        movement_type="SALE_RETURN",
                        quantity_change=r_item.quantity_returned,
                        balance_after=batch.current_quantity,
                        reference_id=sale_return.id,
                        notes=f"Return {return_num}"
                    )
                    db.add(movement)
            
            # Ledger update
            if sale.customer_id:
                customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
                customer.current_balance -= return_in.refund_amount
                ledger = CustomerLedger(
                    customer_id=customer.id,
                    branch_id=branch_id,
                    tenant_id=tenant_id,
                    transaction_date=datetime.utcnow(),
                    transaction_type="Sale Return",
                    reference_id=return_num,
                    debit=0.0,
                    credit=return_in.refund_amount,
                    balance_after=customer.current_balance
                )
                db.add(ledger)
                db.add(customer)
                
            sale.status = "Partially Returned"
            db.commit()
            db.refresh(sale_return)
            return sale_return
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

    @staticmethod
    def process_item_wise_return(
        db: Session,
        sale_id: str,
        payload: SaleReturnCreateRequest,
        tenant_id: str,
        branch_id: str,
        user_id: str
    ) -> SaleReturn:
        """
        Process partial or full returns of items from a specific sale.
        Validates returned quantities and adjusts stock + customer ledger balances accordingly.
        """
        try:
            query = db.query(Sale).filter(
                Sale.id == sale_id,
                Sale.tenant_id == tenant_id,
                Sale.is_deleted == False
            )
            if branch_id:
                query = query.filter(Sale.branch_id == branch_id)
            sale = query.first()
            if not sale:
                raise ValueError("Sale not found or access denied")

            if sale.status in ("Held", "Voided"):
                raise ValueError(f"Cannot return items from a sale with status: {sale.status}")

            return_num = f"RET-{uuid.uuid4().hex[:6].upper()}"
            total_refund_acc = 0.0
            total_cost_returned = 0.0

            # Prepare list of returns to process
            return_items_to_create = []

            for item_req in payload.items:
                sale_item = db.query(SaleItem).filter(
                    SaleItem.id == item_req.sale_item_id,
                    SaleItem.sale_id == sale.id
                ).first()
                if not sale_item:
                    raise ValueError(f"SaleItem with ID {item_req.sale_item_id} does not belong to this sale")

                if item_req.quantity_returned <= 0:
                    raise ValueError("Returned quantity must be greater than zero")

                # Validate quantities
                returned_so_far = sale_item.quantity_returned_so_far
                available_to_return = sale_item.quantity - returned_so_far
                if item_req.quantity_returned > available_to_return:
                    raise ValueError(
                        f"Cannot return {item_req.quantity_returned} items. "
                        f"Already returned {returned_so_far} of {sale_item.quantity} units."
                    )

                # Calculate refund pro-rated
                # (total price paid divided by original quantity) * returned quantity
                unit_price_after_disc = sale_item.total / sale_item.quantity
                refund_amount = unit_price_after_disc * item_req.quantity_returned
                total_refund_acc += refund_amount

                # Create SaleReturnItem model
                return_item = SaleReturnItem(
                    sale_item_id=sale_item.id,
                    medicine_id=sale_item.medicine_id,
                    quantity_returned=item_req.quantity_returned,
                    return_reason=item_req.return_reason,
                    stock_action=item_req.stock_action,
                    unit_price=sale_item.unit_price,
                    total_refund=refund_amount,
                    tenant_id=tenant_id
                )
                return_items_to_create.append((sale_item, return_item))

                # Calculate COGS returned
                med = db.query(Medicine).filter(Medicine.id == sale_item.medicine_id).first()
                if med and med.cost_per_base_unit:
                    total_cost_returned += med.cost_per_base_unit * item_req.quantity_returned

            # Create Return Header
            sale_return = SaleReturn(
                return_number=return_num,
                sale_id=sale.id,
                customer_id=sale.customer_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                cashier_id=user_id,
                return_date=datetime.utcnow(),
                total_amount=total_refund_acc,
                payment_mode=payload.payment_mode,
                notes=payload.notes,
                status="Completed"
            )
            db.add(sale_return)
            db.flush() # get sale_return.id

            # Process stock updates and persist return items
            for sale_item, return_item in return_items_to_create:
                return_item.sale_return_id = sale_return.id
                db.add(return_item)

                # Stock adjustments
                if return_item.stock_action == "Returned to Stock":
                    if sale_item.batch_id:
                        batch = db.query(Batch).filter(Batch.id == sale_item.batch_id).first()
                        if batch:
                            batch.current_quantity += return_item.quantity_returned
                            db.add(batch)

                            # Log active stock movement
                            movement = StockMovement(
                                medicine_id=sale_item.medicine_id,
                                batch_id=batch.id,
                                branch_id=branch_id,
                                tenant_id=tenant_id,
                                user_id=user_id,
                                movement_type="SALE_RETURN",
                                quantity_change=return_item.quantity_returned,
                                balance_after=batch.current_quantity,
                                reference_id=sale_return.id,
                                notes=f"Returned to Stock (Return {return_num}): {return_item.return_reason or 'No reason'}"
                            )
                            db.add(movement)
                else: # Marked as Damaged
                    # Do not increment batch.current_quantity
                    if sale_item.batch_id:
                        batch = db.query(Batch).filter(Batch.id == sale_item.batch_id).first()
                        if batch:
                            # Log movement for visibility, but quantity_change is 0 for active stock
                            movement = StockMovement(
                                medicine_id=sale_item.medicine_id,
                                batch_id=batch.id,
                                branch_id=branch_id,
                                tenant_id=tenant_id,
                                user_id=user_id,
                                movement_type="DAMAGED_RETURN",
                                quantity_change=0,
                                balance_after=batch.current_quantity,
                                reference_id=sale_return.id,
                                notes=f"Damaged return (Return {return_num}): {return_item.return_reason or 'No reason'}"
                            )
                            db.add(movement)

            # Customer Ledger handling
            if sale.customer_id and total_refund_acc > 0:
                customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
                if customer:
                    if payload.payment_mode == "Store Credit":
                        customer.current_balance -= total_refund_acc
                        
                        ledger = CustomerLedger(
                            customer_id=customer.id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            transaction_date=datetime.utcnow(),
                            transaction_type="Sale Return (Credit)",
                            reference_id=return_num,
                            debit=0.0,
                            credit=total_refund_acc,
                            balance_after=customer.current_balance,
                            notes=f"Store credit return for invoice {sale.invoice_number}"
                        )
                        db.add(ledger)
                        db.add(customer)
                    else: # Cash refund
                        # Record a cash return ledger entry for audits but don't alter balance (since they got cash)
                        ledger = CustomerLedger(
                            customer_id=customer.id,
                            branch_id=branch_id,
                            tenant_id=tenant_id,
                            transaction_date=datetime.utcnow(),
                            transaction_type="Sale Return (Cash)",
                            reference_id=return_num,
                            debit=0.0,
                            credit=0.0,
                            balance_after=customer.current_balance,
                            notes=f"Cash refund {total_refund_acc:.2f} for invoice {sale.invoice_number}"
                        )
                        db.add(ledger)

            # Update Sale Status
            # Let's count total items returned so far across all items in the sale
            db.flush() # ensure current return items are counted in DB
            
            # Since relationship is cached, we must sum directly from the DB to be safe
            total_items_sold = sum(si.quantity for si in sale.items)
            
            # Query db directly to bypass relationship caching
            from sqlalchemy import func
            total_returned_db = db.query(func.sum(SaleReturnItem.quantity_returned))\
                .join(SaleItem)\
                .filter(SaleItem.sale_id == sale.id)\
                .scalar() or 0
                
            if total_returned_db >= total_items_sold:
                sale.status = "Returned"
            elif total_returned_db > 0:
                sale.status = "Partially Returned"

            # --- Auto Posting ---
            from services.auto_posting_service import AutoPostingService
            auto_post = AutoPostingService(db)
            auto_post.post_sales_return(
                tenant_id=tenant_id,
                user_id=user_id,
                refund_reference=return_num,
                original_invoice=sale.invoice_number,
                refund_amount=total_refund_acc,
                cost_of_items_returned=total_cost_returned,
                payment_method=payload.payment_mode
            )

            db.commit()
            db.refresh(sale_return)
            return sale_return

        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
