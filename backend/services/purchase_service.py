from sqlalchemy.orm import Session
from datetime import date
import uuid
from fastapi import HTTPException
from models.purchase import PurchaseOrder, POItem, GRN, SupplierLedger, Supplier, PurchaseInvoice, SupplierPayment
from models.inventory import Batch, StockMovement, Medicine
from schemas.purchase import PurchaseOrderCreate, GRNCreate

class PurchaseService:
    @staticmethod
    def create_purchase_order(db: Session, po_in: PurchaseOrderCreate, tenant_id: str, branch_id: str, user_id: str) -> PurchaseOrder:
        order_num = f"PO-{uuid.uuid4().hex[:6].upper()}"
        
        db_po = PurchaseOrder(
            order_number=order_num,
            supplier_id=po_in.supplier_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            expected_delivery_date=po_in.expected_delivery_date,
            total_amount=po_in.total_amount,
            status="Draft"
        )
        db.add(db_po)
        db.commit()
        db.refresh(db_po)
        
        for item in po_in.items:
            db_item = POItem(
                po_id=db_po.id,
                medicine_id=item.medicine_id,
                quantity_ordered=item.quantity_ordered,
                unit_price=item.unit_price,
                tenant_id=tenant_id
            )
            db.add(db_item)
            
        db.commit()
        db.refresh(db_po)
        return db_po

    @staticmethod
    def bulk_draft_po(db: Session, medicine_ids: list[str], tenant_id: str, branch_id: str, user_id: str):
        from models.inventory import Medicine, Batch
        
        # Group medicines by default supplier (from most recent batch)
        supplier_groups = {}
        for med_id in medicine_ids:
            med = db.query(Medicine).filter(Medicine.id == med_id, Medicine.tenant_id == tenant_id).first()
            if not med:
                continue
                
            latest_batch = db.query(Batch).filter(
                Batch.medicine_id == med_id,
                Batch.branch_id == branch_id,
                Batch.tenant_id == tenant_id,
                Batch.is_deleted == False,
                Batch.supplier_id != None
            ).order_by(Batch.created_at.desc()).first()
            
            sup_id = latest_batch.supplier_id if latest_batch else None
            if not sup_id:
                # If no supplier found, skip or assign to a generic/unknown bucket. We skip for now.
                continue
                
            if sup_id not in supplier_groups:
                supplier_groups[sup_id] = []
                
            # Calculate reorder quantity
            # We need current stock
            from sqlalchemy import func
            current_stock = db.query(func.sum(Batch.current_quantity)).filter(
                Batch.medicine_id == med_id,
                Batch.branch_id == branch_id,
                Batch.tenant_id == tenant_id,
                Batch.is_deleted == False
            ).scalar() or 0
            
            suggested_qty = max(0, (med.max_stock_level or (med.min_stock_level * 2)) - current_stock)
            if suggested_qty <= 0:
                suggested_qty = med.min_stock_level or 10 # fallback
                
            supplier_groups[sup_id].append({
                "medicine_id": med_id,
                "quantity": suggested_qty,
                "unit_price": med.purchase_price
            })
            
        created_pos = []
        for sup_id, items in supplier_groups.items():
            order_num = f"PO-{uuid.uuid4().hex[:6].upper()}"
            total_amount = sum(item["quantity"] * item["unit_price"] for item in items)
            
            db_po = PurchaseOrder(
                order_number=order_num,
                supplier_id=sup_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                expected_delivery_date=date.today(), # Or +7 days
                total_amount=total_amount,
                status="Draft"
            )
            db.add(db_po)
            db.flush()
            
            for item in items:
                db_item = POItem(
                    po_id=db_po.id,
                    medicine_id=item["medicine_id"],
                    quantity_ordered=item["quantity"],
                    unit_price=item["unit_price"],
                    tenant_id=tenant_id
                )
                db.add(db_item)
                
            created_pos.append(db_po)
            
        db.commit()
        for po in created_pos:
            db.refresh(po)
        return created_pos

    @staticmethod
    def get_auto_suggest(db: Session, tenant_id: str, branch_id: str, region: str = None, supplier_id: str = None, strategy: str = "low_stock"):
        from models.inventory import Medicine, Batch
        from models.purchase import SupplierMedicinePrice, Supplier
        from sqlalchemy import func
        
        query = db.query(Medicine).filter(Medicine.tenant_id == tenant_id, Medicine.is_deleted == False)
        medicines = query.all()
        
        results = []
        for med in medicines:
            current_stock = db.query(func.sum(Batch.current_quantity)).filter(
                Batch.medicine_id == med.id,
                Batch.branch_id == branch_id,
                Batch.tenant_id == tenant_id,
                Batch.is_deleted == False
            ).scalar() or 0
            
            reorder_level = med.reorder_level or 10
            
            if strategy == "predictive":
                # For predictive restock, we skip items that have zero sales velocity (simulated via current_stock for now,
                # but let's just bypass the low stock filter and suggest 20% of max stock)
                suggested_qty = max(0, int((med.max_stock_level or (reorder_level * 2)) * 0.2))
                if suggested_qty <= 0:
                    suggested_qty = 5
            else:
                if current_stock > reorder_level:
                    continue
                suggested_qty = max(0, (med.max_stock_level or (reorder_level * 2)) - current_stock)
                if suggested_qty <= 0:
                    suggested_qty = reorder_level
            
            sup_query = db.query(SupplierMedicinePrice, Supplier).join(Supplier).filter(
                SupplierMedicinePrice.medicine_id == med.id,
                Supplier.is_active == True
            )
            
            if region:
                sup_query = sup_query.filter(Supplier.region_name == region)
            if supplier_id:
                sup_query = sup_query.filter(Supplier.id == supplier_id)
                
            options = sup_query.all()
            
            if not options:
                continue
                
            supplier_options = []
            for price_mapping, sup in options:
                trade_price = price_mapping.trade_price
                is_fallback = False
                
                if not trade_price or trade_price <= 0:
                    trade_price = med.cost_per_base_unit or 0.0
                    is_fallback = True
                    
                supplier_options.append({
                    "supplier_id": sup.id,
                    "supplier_name": sup.name,
                    "trade_price": trade_price,
                    "exclusive_discount_percentage": price_mapping.exclusive_discount_percentage,
                    "bonus_scheme_threshold": price_mapping.bonus_scheme_threshold,
                    "delivery_lead_time_days": price_mapping.delivery_lead_time_days,
                    "is_fallback": is_fallback
                })
                
            results.append({
                "medicine_id": med.id,
                "medicine_name": med.name,
                "current_stock": current_stock,
                "suggested_quantity": suggested_qty,
                "sales_velocity": "High" if strategy == "predictive" else "Medium",
                "options": supplier_options
            })
            
        return results

    @staticmethod
    def generate_auto_split_po(db: Session, items: list, tenant_id: str, branch_id: str, user_id: str):
        from models.purchase import PurchaseOrder, POItem
        
        supplier_groups = {}
        for item in items:
            sup_id = item["supplier_id"]
            if sup_id not in supplier_groups:
                supplier_groups[sup_id] = []
            supplier_groups[sup_id].append(item)
            
        created_pos = []
        for sup_id, sup_items in supplier_groups.items():
            order_num = f"PO-{uuid.uuid4().hex[:6].upper()}"
            total_amount = sum(item["quantity"] * item["unit_price"] for item in sup_items)
            
            db_po = PurchaseOrder(
                order_number=order_num,
                supplier_id=sup_id,
                branch_id=branch_id,
                tenant_id=tenant_id,
                expected_delivery_date=date.today(),
                total_amount=total_amount,
                status="Draft"
            )
            db.add(db_po)
            db.flush()
            
            for item in sup_items:
                db_item = POItem(
                    po_id=db_po.id,
                    medicine_id=item["medicine_id"],
                    quantity_ordered=item["quantity"],
                    unit_price=item["unit_price"],
                    tenant_id=tenant_id
                )
                db.add(db_item)
                
            created_pos.append(db_po)
            
        db.commit()
        for po in created_pos:
            db.refresh(po)
        return created_pos

    @staticmethod
    def approve_po(db: Session, po_id: str, tenant_id: str):
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.tenant_id == tenant_id).first()
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        if po.status != "Draft" and po.status != "Submitted":
            raise HTTPException(status_code=400, detail="Only Draft or Submitted POs can be approved")
        po.status = "Approved"
        db.commit()
        return po

    @staticmethod
    def cancel_po(db: Session, po_id: str, tenant_id: str):
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.tenant_id == tenant_id).first()
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        if po.status not in ["Draft", "Approved"]:
            raise HTTPException(status_code=400, detail="Only Draft or Approved POs can be cancelled")
        po.status = "Cancelled"
        db.commit()
        return po

    @staticmethod
    def receive_grn(db: Session, grn_in: GRNCreate, tenant_id: str, branch_id: str, user_id: str) -> GRN:
        # 1. Create GRN
        grn_num = f"GRN-{uuid.uuid4().hex[:6].upper()}"
        grn = GRN(
            grn_number=grn_num,
            po_id=grn_in.po_id,
            supplier_id=grn_in.supplier_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            received_date=grn_in.received_date or date.today(),
            total_amount=grn_in.total_amount,
            status="Confirmed"
        )
        db.add(grn)
        
        po = None
        if grn_in.po_id:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == grn_in.po_id).first()
            if po and po.status == "Approved":
                po.status = "Partially Received"
        
        # 2. Iterate items, create Batches, update Medicine stock, log Movement
        for item in grn_in.items:
            # Check for existing active batch
            existing_batch = db.query(Batch).filter(
                Batch.medicine_id == item.medicine_id,
                Batch.batch_number == item.batch_number,
                Batch.tenant_id == tenant_id,
                Batch.is_deleted == False
            ).first()
            
            if existing_batch:
                raise HTTPException(status_code=400, detail=f"Batch {item.batch_number} already exists for this medicine.")
            
            # Create Batch
            batch = Batch(
                batch_number=item.batch_number,
                medicine_id=item.medicine_id,
                tenant_id=tenant_id,
                branch_id=branch_id,
                supplier_id=grn_in.supplier_id,
                manufacturing_date=item.manufacturing_date,
                expiry_date=item.expiry_date,
                purchase_price=item.purchase_price,
                current_quantity=item.quantity_received,
                initial_quantity=item.quantity_received,
                status="Active"
            )
            db.add(batch)
            db.flush() # get batch ID
            
            # Update PO Item received qty if applicable
            if po:
                po_item = db.query(POItem).filter(POItem.id == item.po_item_id).first()
                if po_item:
                    po_item.quantity_received += item.quantity_received
                    db.add(po_item)
            
            # Stock Movement
            movement = StockMovement(
                medicine_id=item.medicine_id,
                batch_id=batch.id,
                branch_id=branch_id,
                user_id=user_id,
                tenant_id=tenant_id,
                movement_type="PURCHASE_RECEIPT",
                quantity_change=item.quantity_received,
                balance_after=item.quantity_received,
                reference_id=grn.id,
                notes=f"Received via {grn_num}"
            )
            db.add(movement)
            
            # Update Medicine pricing
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            if medicine:
                medicine.cost_per_base_unit = item.purchase_price
                if getattr(item, 'apply_to_old_stock', False):
                    medicine.unit_retail_price = item.selling_price
                    db.query(Batch).filter(
                        Batch.medicine_id == item.medicine_id,
                        Batch.tenant_id == tenant_id,
                        Batch.is_deleted == False,
                        Batch.status == "Active"
                    ).update({"unit_selling_price": item.selling_price})
                
                # Set price for the new batch we just created
                batch.unit_selling_price = item.selling_price
                
                db.add(medicine)
                db.add(batch)

        # 3. Handle final PO status transition to Completed
        if po:
            all_received = True
            for po_item in po.items:
                if po_item.quantity_received < po_item.quantity_ordered:
                    all_received = False
                    break
            po.status = "Completed" if all_received else "Partially Received"
            db.add(po)

        db.commit()
        db.refresh(grn)

        # 4. Auto-create Purchase Invoice from GRN
        inv_number = f"INV-{uuid.uuid4().hex[:6].upper()}"
        invoice = PurchaseInvoice(
            invoice_number=inv_number,
            grn_id=grn.id,
            supplier_id=grn_in.supplier_id,
            tenant_id=tenant_id,
            invoice_date=grn.received_date,
            due_date=grn.received_date,
            total_amount=grn_in.total_amount,
            tax_amount=0.0,
            amount_paid=0.0,
            status="Unpaid"
        )
        db.add(invoice)

        # Update supplier balance
        supplier = db.query(Supplier).filter(Supplier.id == grn_in.supplier_id).first()
        if supplier:
            supplier.current_balance += grn_in.total_amount
            db.add(supplier)

            # Ledger entry
            ledger = SupplierLedger(
                supplier_id=supplier.id,
                tenant_id=tenant_id,
                branch_id=branch_id,
                transaction_date=grn.received_date,
                transaction_type="Invoice",
                reference_id=inv_number,
                debit=grn_in.total_amount,
                credit=0.0,
                balance_after=supplier.current_balance,
                notes=f"Auto-invoice {inv_number} from {grn_num}"
            )
            db.add(ledger)
            
            # --- Auto Posting ---
            from services.auto_posting_service import AutoPostingService
            auto_post = AutoPostingService(db)
            je = auto_post.post_purchase_invoice(tenant_id, user_id, inv_number, grn_in.total_amount, supplier.name)
            if je:
                invoice.journal_entry_id = je.id

        db.commit()
        db.refresh(grn)
        return grn

    @staticmethod
    def add_supplier_invoice(db: Session, invoice_in, tenant_id: str):
        # Create invoice
        import uuid
        inv = PurchaseInvoice(**invoice_in.model_dump())
        inv.tenant_id = tenant_id
        inv.invoice_number = f"INV-{uuid.uuid4().hex[:6].upper()}"
        db.add(inv)
        
        # Update Supplier Balance (Credit our payable)
        supplier = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first()
        supplier.current_balance += inv.total_amount
        
        # Ledger Entry
        ledger = SupplierLedger(
            supplier_id=supplier.id,
            tenant_id=tenant_id,
            transaction_date=inv.invoice_date or date.today(),
            transaction_type="Invoice",
            reference_id=inv.invoice_number,
            debit=inv.total_amount,
            credit=0.0,
            balance_after=supplier.current_balance,
            notes=f"Invoice {inv.invoice_number} generated from GRN"
        )
        db.add(ledger)
        
        # --- Auto Posting ---
        from services.auto_posting_service import AutoPostingService
        auto_post = AutoPostingService(db)
        je = auto_post.post_purchase_invoice(tenant_id, "SYSTEM", inv.invoice_number, inv.total_amount, supplier.name)
        if je:
            inv.journal_entry_id = je.id
            
        db.commit()
        db.refresh(inv)
        return inv

    @staticmethod
    def add_supplier_payment(db: Session, payment_in, tenant_id: str, branch_id: str):
        payment = SupplierPayment(**payment_in.model_dump())
        payment.tenant_id = tenant_id
        payment.branch_id = branch_id
        payment.payment_date = date.today()
        db.add(payment)
        
        # Decrease Supplier Balance (We paid them)
        supplier = db.query(Supplier).filter(Supplier.id == payment.supplier_id).first()
        supplier.current_balance -= payment.amount
        
        # Update Invoice Status if linked
        inv_ref = payment.reference_number or "PAYMENT"
        if payment.invoice_id:
            inv = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == payment.invoice_id).first()
            if inv:
                inv.amount_paid += payment.amount
                inv.status = "Paid" if inv.amount_paid >= inv.total_amount else "Partial"
                db.add(inv)
                inv_ref = inv.invoice_number

        # Ledger Entry
        ledger = SupplierLedger(
            supplier_id=supplier.id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            transaction_date=payment.payment_date,
            transaction_type="Payment",
            reference_id=payment.reference_number or "PAYMENT",
            debit=0.0,
            credit=payment.amount,
            balance_after=supplier.current_balance,
            notes=f"Payment via {payment.payment_method}"
        )
        db.add(ledger)
        
        # --- Auto Posting ---
        from services.auto_posting_service import AutoPostingService
        auto_post = AutoPostingService(db)
        auto_post.post_purchase_payment(
            tenant_id=tenant_id,
            user_id="SYSTEM",
            invoice_reference=inv_ref,
            amount_paid=payment.amount,
            payment_method=payment.payment_method,
            supplier_name=supplier.name
        )
        
        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def create_purchase_return(db: Session, return_in: 'PurchaseReturnCreate', tenant_id: str, branch_id: str, user_id: str) -> 'PurchaseReturn':
        from models.purchase import PurchaseReturn, PurchaseReturnItem
        from services.inventory_service import InventoryService
        
        return_num = f"PR-{uuid.uuid4().hex[:6].upper()}"
        
        db_pr = PurchaseReturn(
            return_number=return_num,
            po_id=return_in.po_id,
            grn_id=return_in.grn_id,
            supplier_id=return_in.supplier_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            return_date=date.today(),
            total_amount=return_in.total_amount,
            reason=return_in.reason,
            status="Completed"
        )
        db.add(db_pr)
        db.commit()
        db.refresh(db_pr)
        
        for item in return_in.items:
            db_item = PurchaseReturnItem(
                purchase_return_id=db_pr.id,
                medicine_id=item.medicine_id,
                quantity_returned=item.quantity_returned,
                unit_price=item.unit_price,
                tenant_id=tenant_id
            )
            db.add(db_item)
            
            # Deduct inventory using FEFO logic
            InventoryService.allocate_fefo(
                db=db,
                tenant_id=tenant_id,
                branch_id=branch_id,
                medicine_id=item.medicine_id,
                quantity_required=item.quantity_returned,
                user_id=user_id,
                reference_id=db_pr.id,
                movement_type="Purchase Return"
            )

        # Update Supplier Balance
        supplier = db.query(Supplier).filter(Supplier.id == return_in.supplier_id, Supplier.tenant_id == tenant_id).first()
        if supplier:
            # Return means they owe us money / our payable reduces
            supplier.current_balance -= return_in.total_amount
            db.add(supplier)
            
            # Ledger Entry
            ledger = SupplierLedger(
                supplier_id=supplier.id,
                tenant_id=tenant_id,
                branch_id=branch_id,
                transaction_date=date.today(),
                transaction_type="Purchase Return",
                reference_id=db_pr.id,
                debit=return_in.total_amount, # Reduces payable
                credit=0.0,
                balance_after=supplier.current_balance,
                notes=f"PO Return: {db_pr.return_number}"
            )
            db.add(ledger)
        
        # --- Auto Posting ---
        from services.auto_posting_service import AutoPostingService
        auto_post = AutoPostingService(db)
        auto_post.post_purchase_return(
            tenant_id=tenant_id,
            user_id=user_id,
            reference=db_pr.return_number,
            amount=return_in.total_amount
        )
            
        db.commit()
        db.refresh(db_pr)
        return db_pr

    # =====================================================================
    # Enterprise Purchase Service Methods
    # =====================================================================

    @staticmethod
    def create_purchase_request(db: Session, req_in, tenant_id: str, branch_id: str, user_id: str):
        from models.purchase import PurchaseRequest, PurchaseRequestItem
        request_num = f"PRQ-{uuid.uuid4().hex[:6].upper()}"
        
        db_req = PurchaseRequest(
            request_number=request_num,
            branch_id=branch_id,
            tenant_id=tenant_id,
            requested_by=user_id,
            request_date=req_in.request_date or date.today(),
            required_date=req_in.required_date,
            status=req_in.status,
            priority=req_in.priority,
            remarks=req_in.remarks
        )
        db.add(db_req)
        db.commit()
        db.refresh(db_req)
        
        for item in req_in.items:
            db_item = PurchaseRequestItem(
                request_id=db_req.id,
                medicine_id=item.medicine_id,
                quantity_requested=item.quantity_requested,
                quantity_approved=item.quantity_approved,
                remarks=item.remarks,
                tenant_id=tenant_id
            )
            db.add(db_item)
            
        db.commit()
        db.refresh(db_req)
        return db_req

    @staticmethod
    def _enrich_request(db, req) -> dict:
        """Convert a PurchaseRequest ORM object to an enriched dict with medicine/user names."""
        from models.inventory import Medicine
        from models.users import User

        # Resolve requester username
        requested_by_name = None
        if req.requested_by:
            user = db.query(User).filter(User.id == req.requested_by).first()
            if user:
                requested_by_name = user.full_name or user.username

        # Build items with resolved medicine names
        enriched_items = []
        for item in (req.items or []):
            med_name = None
            if item.medicine_id:
                med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
                if med:
                    med_name = med.name
            enriched_items.append({
                "id": item.id,
                "medicine_id": item.medicine_id,
                "medicine_name": med_name,
                "quantity_requested": item.quantity_requested,
                "quantity_approved": item.quantity_approved,
                "remarks": item.remarks,
            })

        return {
            "id": req.id,
            "request_number": req.request_number,
            "branch_id": req.branch_id,
            "requested_by": req.requested_by,
            "requested_by_name": requested_by_name,
            "request_date": req.request_date,
            "required_date": req.required_date,
            "status": req.status,
            "priority": req.priority,
            "remarks": req.remarks,
            "items": enriched_items,
        }

    @staticmethod
    def get_purchase_requests(db: Session, tenant_id: str, branch_id: str = None, skip: int = 0, limit: int = 100):
        from models.purchase import PurchaseRequest
        query = db.query(PurchaseRequest).filter(
            PurchaseRequest.tenant_id == tenant_id,
            PurchaseRequest.is_deleted == False
        )
        if branch_id:
            query = query.filter(PurchaseRequest.branch_id == branch_id)
        rows = query.order_by(PurchaseRequest.created_at.desc()).offset(skip).limit(limit).all()
        return [PurchaseService._enrich_request(db, r) for r in rows]

    @staticmethod
    def get_purchase_request(db: Session, request_id: str, tenant_id: str):
        from models.purchase import PurchaseRequest
        req = db.query(PurchaseRequest).filter(
            PurchaseRequest.id == request_id,
            PurchaseRequest.tenant_id == tenant_id,
            PurchaseRequest.is_deleted == False
        ).first()
        if not req:
            return None
        return PurchaseService._enrich_request(db, req)

    @staticmethod
    def _enrich_quotation(db, quot) -> dict:
        """Build enriched quotation dict with supplier name, medicine names, and line totals."""
        from models.inventory import Medicine
        from models.purchase import PurchaseRequest

        # Resolve supplier info
        supplier_name = None
        if hasattr(quot, 'supplier') and quot.supplier:
            supplier_name = quot.supplier.name
        elif quot.supplier_id:
            sup = db.query(Supplier).filter(Supplier.id == quot.supplier_id).first()
            supplier_name = sup.name if sup else None

        # Resolve linked request number
        request_number = None
        if quot.request_id:
            req = db.query(PurchaseRequest).filter(PurchaseRequest.id == quot.request_id).first()
            if req:
                request_number = req.request_number

        # Compute supplier score
        score = PurchaseService.compute_supplier_score(db, quot.supplier_id, quot.tenant_id)

        # Build enriched items
        enriched_items = []
        for item in (quot.items or []):
            med_name = None
            if hasattr(item, 'medicine') and item.medicine:
                med_name = item.medicine.name
            elif item.medicine_id:
                med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
                med_name = med.name if med else None

            qty = item.quantity or 0
            up = item.unit_price or 0.0
            disc = item.discount_percentage or 0.0
            tax = item.tax_percentage or 0.0
            line_subtotal = qty * up
            line_discount = line_subtotal * disc / 100
            line_tax = (line_subtotal - line_discount) * tax / 100
            line_total = line_subtotal - line_discount + line_tax

            enriched_items.append({
                "id": item.id,
                "medicine_id": item.medicine_id,
                "medicine_name": med_name,
                "quantity": qty,
                "unit_price": up,
                "discount_percentage": disc,
                "tax_percentage": tax,
                "lead_time_days": item.lead_time_days or 1,
                "moq": item.moq or 1,
                "brand": item.brand,
                "manufacturer": item.manufacturer,
                "batch_number": item.batch_number,
                "expiry_date": item.expiry_date,
                "line_notes": item.line_notes,
                "line_total": round(line_total, 2),
            })

        return {
            "id": quot.id,
            "quotation_number": quot.quotation_number,
            "request_id": quot.request_id,
            "request_number": request_number,
            "supplier_id": quot.supplier_id,
            "supplier_name": supplier_name,
            "branch_id": quot.branch_id,
            "warehouse_id": quot.warehouse_id,
            "quotation_date": quot.quotation_date,
            "valid_until": quot.valid_until,
            "currency": quot.currency or "PKR",
            "status": quot.status,
            "total_amount": quot.total_amount or 0.0,
            "subtotal": quot.subtotal or 0.0,
            "discount_amount": quot.discount_amount or 0.0,
            "tax_amount": quot.tax_amount or 0.0,
            "payment_terms": quot.payment_terms,
            "delivery_terms": quot.delivery_terms,
            "warranty": quot.warranty,
            "remarks": quot.remarks,
            "attachment_url": quot.attachment_url,
            "supplier_score": score.get("overall_score"),
            "items": enriched_items,
        }

    @staticmethod
    def compute_supplier_score(db: Session, supplier_id: str, tenant_id: str) -> dict:
        """Auto-compute supplier scorecard from historical PO, GRN, Return, and delivery data."""
        from models.purchase import PurchaseReturn, PurchaseReturnItem
        from datetime import datetime, timedelta

        # Count total POs
        total_pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.supplier_id == supplier_id,
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrder.is_deleted == False
        ).count()

        if total_pos == 0:
            return {"overall_score": 0.0, "total_orders": 0,
                    "on_time_delivery_pct": 0.0, "quality_score": 0.0,
                    "return_rate": 0.0, "avg_lead_time_days": 0.0}

        # On-time delivery: GRN received_date <= PO expected_delivery_date
        pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.supplier_id == supplier_id,
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrder.is_deleted == False,
            PurchaseOrder.expected_delivery_date != None
        ).all()

        on_time = 0
        total_with_date = len(pos)
        lead_times = []

        for po in pos:
            grn = db.query(GRN).filter(GRN.po_id == po.id).first()
            if grn and grn.received_date and po.expected_delivery_date:
                if grn.received_date <= po.expected_delivery_date:
                    on_time += 1
                lead_days = (grn.received_date - po.expected_delivery_date).days
                lead_times.append(abs(lead_days))

        on_time_pct = (on_time / total_with_date * 100) if total_with_date > 0 else 0.0
        avg_lead = sum(lead_times) / len(lead_times) if lead_times else 0.0

        # Return rate
        total_returned = db.query(PurchaseReturn).filter(
            PurchaseReturn.supplier_id == supplier_id,
            PurchaseReturn.tenant_id == tenant_id,
            PurchaseReturn.is_deleted == False
        ).count()
        return_rate = (total_returned / total_pos * 100) if total_pos > 0 else 0.0
        quality_score = max(0.0, 100.0 - return_rate)

        # Weighted overall score (on_time 40% + quality 40% + orders bonus 20%)
        orders_bonus = min(20.0, total_pos * 2.0)
        overall = (on_time_pct * 0.40) + (quality_score * 0.40) + orders_bonus

        return {
            "overall_score": round(overall, 1),
            "total_orders": total_pos,
            "on_time_delivery_pct": round(on_time_pct, 1),
            "quality_score": round(quality_score, 1),
            "return_rate": round(return_rate, 1),
            "avg_lead_time_days": round(avg_lead, 1),
        }

    @staticmethod
    def create_purchase_quotation(db: Session, quot_in, tenant_id: str, branch_id: str, user_id: str = None):
        from models.purchase import PurchaseQuotation, PurchaseQuotationItem, PurchaseTimeline
        quot_num = f"QT-{uuid.uuid4().hex[:6].upper()}"

        # Calculate totals from items
        subtotal = sum(i.quantity * i.unit_price for i in quot_in.items)
        disc_amt = sum(i.quantity * i.unit_price * i.discount_percentage / 100 for i in quot_in.items)
        tax_amt = sum((i.quantity * i.unit_price - i.quantity * i.unit_price * i.discount_percentage / 100) * i.tax_percentage / 100 for i in quot_in.items)
        total = subtotal - disc_amt + tax_amt

        db_quot = PurchaseQuotation(
            quotation_number=quot_num,
            request_id=quot_in.request_id,
            supplier_id=quot_in.supplier_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            warehouse_id=getattr(quot_in, 'warehouse_id', None),
            quotation_date=getattr(quot_in, 'quotation_date', date.today()),
            valid_until=quot_in.valid_until,
            currency=getattr(quot_in, 'currency', 'PKR'),
            status=quot_in.status,
            subtotal=round(subtotal, 2),
            discount_amount=round(disc_amt, 2),
            tax_amount=round(tax_amt, 2),
            total_amount=round(total, 2),
            payment_terms=getattr(quot_in, 'payment_terms', None),
            delivery_terms=getattr(quot_in, 'delivery_terms', None),
            warranty=getattr(quot_in, 'warranty', None),
            remarks=quot_in.remarks,
            attachment_url=getattr(quot_in, 'attachment_url', None),
        )
        db.add(db_quot)
        db.commit()
        db.refresh(db_quot)

        for item in quot_in.items:
            db_item = PurchaseQuotationItem(
                quotation_id=db_quot.id,
                medicine_id=item.medicine_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_percentage=item.discount_percentage,
                tax_percentage=item.tax_percentage,
                lead_time_days=item.lead_time_days,
                moq=getattr(item, 'moq', 1),
                brand=getattr(item, 'brand', None),
                manufacturer=getattr(item, 'manufacturer', None),
                batch_number=getattr(item, 'batch_number', None),
                expiry_date=getattr(item, 'expiry_date', None),
                line_notes=getattr(item, 'line_notes', None),
                tenant_id=tenant_id
            )
            db.add(db_item)

        db.commit()
        db.refresh(db_quot)

        # Audit timeline
        if user_id:
            tl = PurchaseTimeline(
                tenant_id=tenant_id,
                reference_id=db_quot.id,
                reference_type="PurchaseQuotation",
                action="Created",
                user_id=user_id,
                remarks=f"Quotation {quot_num} created"
            )
            db.add(tl)
            db.commit()

        return db_quot

    @staticmethod
    def get_purchase_quotations(db: Session, tenant_id: str, request_id: str = None, skip: int = 0, limit: int = 100):
        from models.purchase import PurchaseQuotation
        query = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.tenant_id == tenant_id,
            PurchaseQuotation.is_deleted == False
        )
        if request_id:
            query = query.filter(PurchaseQuotation.request_id == request_id)
        rows = query.order_by(PurchaseQuotation.created_at.desc()).offset(skip).limit(limit).all()
        return [PurchaseService._enrich_quotation(db, r) for r in rows]

    @staticmethod
    def get_purchase_quotation(db: Session, quotation_id: str, tenant_id: str):
        from models.purchase import PurchaseQuotation
        quot = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.id == quotation_id,
            PurchaseQuotation.tenant_id == tenant_id,
            PurchaseQuotation.is_deleted == False
        ).first()
        if not quot:
            return None
        return PurchaseService._enrich_quotation(db, quot)

    @staticmethod
    def update_quotation(db: Session, quotation_id: str, update_in, tenant_id: str, user_id: str):
        from models.purchase import PurchaseQuotation, PurchaseQuotationItem, PurchaseTimeline
        quot = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.id == quotation_id,
            PurchaseQuotation.tenant_id == tenant_id,
            PurchaseQuotation.is_deleted == False
        ).first()
        if not quot:
            raise HTTPException(status_code=404, detail="Quotation not found")

        update_data = update_in.model_dump(exclude_unset=True, exclude={"items"})
        for field, value in update_data.items():
            setattr(quot, field, value)

        # If items provided, replace them
        if update_in.items is not None:
            db.query(PurchaseQuotationItem).filter(
                PurchaseQuotationItem.quotation_id == quotation_id
            ).delete()
            for item in update_in.items:
                db.add(PurchaseQuotationItem(
                    quotation_id=quotation_id,
                    medicine_id=item.medicine_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    discount_percentage=item.discount_percentage,
                    tax_percentage=item.tax_percentage,
                    lead_time_days=item.lead_time_days,
                    moq=getattr(item, 'moq', 1),
                    brand=getattr(item, 'brand', None),
                    manufacturer=getattr(item, 'manufacturer', None),
                    batch_number=getattr(item, 'batch_number', None),
                    expiry_date=getattr(item, 'expiry_date', None),
                    line_notes=getattr(item, 'line_notes', None),
                    tenant_id=tenant_id
                ))
            # Recalculate totals
            subtotal = sum(i.quantity * i.unit_price for i in update_in.items)
            disc = sum(i.quantity * i.unit_price * i.discount_percentage / 100 for i in update_in.items)
            tax = sum((i.quantity * i.unit_price - i.quantity * i.unit_price * i.discount_percentage / 100) * i.tax_percentage / 100 for i in update_in.items)
            quot.subtotal = round(subtotal, 2)
            quot.discount_amount = round(disc, 2)
            quot.tax_amount = round(tax, 2)
            quot.total_amount = round(subtotal - disc + tax, 2)

        db.commit()
        db.refresh(quot)

        # Timeline
        tl = PurchaseTimeline(
            tenant_id=tenant_id,
            reference_id=quotation_id,
            reference_type="PurchaseQuotation",
            action="Updated",
            user_id=user_id,
            remarks="Quotation updated"
        )
        db.add(tl)
        db.commit()
        return PurchaseService._enrich_quotation(db, quot)

    @staticmethod
    def update_quotation_status(db: Session, quotation_id: str, status: str, user_id: str, tenant_id: str, remarks: str = None):
        from models.purchase import PurchaseQuotation, PurchaseTimeline
        quot = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.id == quotation_id,
            PurchaseQuotation.tenant_id == tenant_id,
            PurchaseQuotation.is_deleted == False
        ).first()
        if not quot:
            raise HTTPException(status_code=404, detail="Quotation not found")

        old_status = quot.status
        quot.status = status
        db.commit()
        db.refresh(quot)

        tl = PurchaseTimeline(
            tenant_id=tenant_id,
            reference_id=quotation_id,
            reference_type="PurchaseQuotation",
            action=f"Status changed: {old_status} → {status}",
            user_id=user_id,
            remarks=remarks or f"Status updated to {status}"
        )
        db.add(tl)
        db.commit()
        return PurchaseService._enrich_quotation(db, quot)

    @staticmethod
    def compare_quotations(db: Session, request_id: str, tenant_id: str):
        """Build full comparison matrix for all quotations linked to a purchase request."""
        from models.purchase import PurchaseQuotation, PurchaseRequest
        from models.inventory import Medicine

        req = db.query(PurchaseRequest).filter(
            PurchaseRequest.id == request_id,
            PurchaseRequest.tenant_id == tenant_id
        ).first()

        quotations = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.request_id == request_id,
            PurchaseQuotation.tenant_id == tenant_id,
            PurchaseQuotation.is_deleted == False
        ).all()

        # Collect all medicine IDs from all quotations
        all_med_ids = list({item.medicine_id for q in quotations for item in q.items})

        # Build per-medicine price maps for lowest price detection
        med_price_map = {}  # med_id -> min unit_price across all quotations
        med_lead_map = {}   # med_id -> min lead_time across all quotations
        for q in quotations:
            for item in q.items:
                if item.medicine_id not in med_price_map or item.unit_price < med_price_map[item.medicine_id]:
                    med_price_map[item.medicine_id] = item.unit_price
                if item.medicine_id not in med_lead_map or item.lead_time_days < med_lead_map[item.medicine_id]:
                    med_lead_map[item.medicine_id] = item.lead_time_days

        entries = []
        min_total = min((q.total_amount or 0.0 for q in quotations), default=0)
        max_lead  = max((max((i.lead_time_days for i in q.items), default=0) for q in quotations), default=0)
        min_lead  = min((max((i.lead_time_days for i in q.items), default=999) for q in quotations), default=0)
        scores    = {}

        for q in quotations:
            score_data = PurchaseService.compute_supplier_score(db, q.supplier_id, tenant_id)
            scores[q.id] = score_data.get("overall_score", 0.0)

            sup_name = q.supplier.name if (hasattr(q, 'supplier') and q.supplier) else q.supplier_id

            items_out = []
            for item in q.items:
                med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
                med_name = med.name if med else item.medicine_id
                qty = item.quantity or 0
                up = item.unit_price or 0.0
                disc = item.discount_percentage or 0.0
                tax = item.tax_percentage or 0.0
                ls = qty * up
                ld = ls * disc / 100
                lt_amt = (ls - ld) * tax / 100
                line_total = ls - ld + lt_amt
                items_out.append({
                    "medicine_id": item.medicine_id,
                    "medicine_name": med_name,
                    "unit_price": up,
                    "discount_percentage": disc,
                    "tax_percentage": tax,
                    "lead_time_days": item.lead_time_days or 1,
                    "line_total": round(line_total, 2),
                    "is_lowest_price": abs(up - med_price_map.get(item.medicine_id, up)) < 0.001,
                    "is_fastest": item.lead_time_days == med_lead_map.get(item.medicine_id, item.lead_time_days),
                })

            scorecard = {
                "supplier_id": q.supplier_id,
                "supplier_name": sup_name,
                **score_data
            }
            q_max_lead = max((i.lead_time_days for i in q.items), default=0)

            entries.append({
                "quotation_id": q.id,
                "quotation_number": q.quotation_number,
                "supplier_id": q.supplier_id,
                "supplier_name": sup_name,
                "total_amount": q.total_amount or 0.0,
                "subtotal": q.subtotal or 0.0,
                "discount_amount": q.discount_amount or 0.0,
                "tax_amount": q.tax_amount or 0.0,
                "valid_until": q.valid_until,
                "currency": q.currency or "PKR",
                "payment_terms": q.payment_terms,
                "delivery_terms": q.delivery_terms,
                "status": q.status,
                "items": items_out,
                "scorecard": scorecard,
                "is_lowest_cost": abs((q.total_amount or 0) - min_total) < 0.01,
                "is_fastest_delivery": q_max_lead == min_lead,
                "is_highest_rated": False,  # Will be updated below
                "is_best_overall": False,
            })

        # Tag highest rated and best overall
        if entries:
            max_score_id = max(scores, key=lambda k: scores[k]) if scores else None
            min_cost_lead = sorted(entries, key=lambda e: (e["total_amount"], e.get("_max_lead", 0)))
            for e in entries:
                if max_score_id and e["quotation_id"] == max_score_id:
                    e["is_highest_rated"] = True
                # Best overall = lowest cost AND fastest delivery
                if e["is_lowest_cost"] and e["is_fastest_delivery"]:
                    e["is_best_overall"] = True
            # If no single entry is both, pick the one with best combined score
            if not any(e["is_best_overall"] for e in entries) and entries:
                best = sorted(entries, key=lambda e: (e["total_amount"], -scores.get(e["quotation_id"], 0)))[0]
                best["is_best_overall"] = True

        return {
            "request_id": request_id,
            "request_number": req.request_number if req else None,
            "medicine_ids": all_med_ids,
            "quotations": entries,
        }

    @staticmethod
    def convert_quotation_to_po(db: Session, quotation_id: str, tenant_id: str, branch_id: str, user_id: str):
        """Convert selected quotation to Purchase Order with one click. All items, prices, taxes transfer automatically."""
        from models.purchase import PurchaseQuotation, PurchaseQuotationItem, PurchaseTimeline
        quot = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.id == quotation_id,
            PurchaseQuotation.tenant_id == tenant_id,
            PurchaseQuotation.is_deleted == False
        ).first()
        if not quot:
            raise HTTPException(status_code=404, detail="Quotation not found")

        order_num = f"PO-{uuid.uuid4().hex[:6].upper()}"
        db_po = PurchaseOrder(
            order_number=order_num,
            supplier_id=quot.supplier_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            total_amount=quot.total_amount or 0.0,
            status="Draft",
            purchase_source="Quotation",
            reference_number=quot.quotation_number,
            remarks=f"Converted from quotation {quot.quotation_number}",
        )
        db.add(db_po)
        db.commit()
        db.refresh(db_po)

        for item in quot.items:
            db_po_item = POItem(
                po_id=db_po.id,
                medicine_id=item.medicine_id,
                quantity_ordered=item.quantity,
                unit_price=item.unit_price,
                discount_percentage=item.discount_percentage,
                tax_percentage=item.tax_percentage,
                tenant_id=tenant_id
            )
            db.add(db_po_item)

        # Mark quotation as Selected
        quot.status = "Selected"
        db.commit()
        db.refresh(db_po)

        # Audit timeline for both quotation and PO
        for ref_id, ref_type, action, remark in [
            (quotation_id, "PurchaseQuotation", "Converted to PO", f"Converted to PO {order_num}"),
            (db_po.id, "PurchaseOrder", "Created from Quotation", f"Created from quotation {quot.quotation_number}"),
        ]:
            tl = PurchaseTimeline(
                tenant_id=tenant_id,
                reference_id=ref_id,
                reference_type=ref_type,
                action=action,
                user_id=user_id,
                remarks=remark
            )
            db.add(tl)
        db.commit()
        return db_po
    @staticmethod
    def add_po_approval(db: Session, approval_in, tenant_id: str, user_id: str):
        from models.purchase import PurchaseApproval, PurchaseOrder
        db_approval = PurchaseApproval(
            po_id=approval_in.po_id,
            approver_id=user_id,
            level=approval_in.level,
            status=approval_in.status,
            comments=approval_in.comments,
            approved_at=date.today(),
            tenant_id=tenant_id
        )
        db.add(db_approval)
        
        # Update PO Status if approved
        if approval_in.status == "Approved":
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == approval_in.po_id).first()
            if po:
                po.approval_status = "Approved"
                po.approved_by = user_id
                po.approved_at = date.today()
                
        db.commit()
        db.refresh(db_approval)
        return db_approval

    @staticmethod
    def get_po_approvals(db: Session, po_id: str, tenant_id: str):
        from models.purchase import PurchaseApproval
        return db.query(PurchaseApproval).filter(
            PurchaseApproval.po_id == po_id,
            PurchaseApproval.tenant_id == tenant_id,
            PurchaseApproval.is_deleted == False
        ).order_by(PurchaseApproval.level.asc()).all()

    @staticmethod
    def receive_enterprise_grn(db: Session, rec_in, tenant_id: str, branch_id: str, user_id: str):
        from models.purchase import PurchaseReceiving, PurchaseReceivingItem
        from services.inventory_service import InventoryService
        
        rec_num = f"RECV-{uuid.uuid4().hex[:6].upper()}"
        
        db_recv = PurchaseReceiving(
            receiving_number=rec_num,
            po_id=rec_in.po_id,
            supplier_id=rec_in.supplier_id,
            branch_id=branch_id,
            warehouse_id=rec_in.warehouse_id,
            tenant_id=tenant_id,
            received_date=rec_in.received_date or date.today(),
            status=rec_in.status,
            total_amount=rec_in.total_amount,
            freight_charge=rec_in.freight_charge,
            landed_cost_allocated=rec_in.landed_cost_allocated
        )
        db.add(db_recv)
        db.commit()
        db.refresh(db_recv)
        
        for item in rec_in.items:
            db_item = PurchaseReceivingItem(
                receiving_id=db_recv.id,
                po_item_id=item.po_item_id,
                medicine_id=item.medicine_id,
                batch_id=item.batch_id,
                quantity_received=item.quantity_received,
                quantity_rejected=item.quantity_rejected,
                bonus_quantity=item.bonus_quantity,
                unit_price=item.unit_price,
                discount_percentage=item.discount_percentage,
                tax_percentage=item.tax_percentage,
                landed_cost=item.landed_cost,
                tenant_id=tenant_id
            )
            db.add(db_item)
            
            # If status is Confirmed, adjust inventory
            if rec_in.status == "Confirmed":
                # Assuming batch is created beforehand or handled by frontend
                if item.batch_id:
                    InventoryService.adjust_stock(
                        db=db,
                        tenant_id=tenant_id,
                        branch_id=branch_id,
                        medicine_id=item.medicine_id,
                        batch_id=item.batch_id,
                        quantity_change=item.quantity_received,
                        user_id=user_id,
                        reference_id=db_recv.id,
                        movement_type="Purchase Receipt"
                    )
        
        db.commit()
        db.refresh(db_recv)
        return db_recv

    @staticmethod
    def get_purchase_receivings(db: Session, tenant_id: str, po_id: str = None, skip: int = 0, limit: int = 100):
        from models.purchase import PurchaseReceiving
        query = db.query(PurchaseReceiving).filter(
            PurchaseReceiving.tenant_id == tenant_id,
            PurchaseReceiving.is_deleted == False
        )
        if po_id:
            query = query.filter(PurchaseReceiving.po_id == po_id)
        return query.order_by(PurchaseReceiving.received_date.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_purchase_receiving(db: Session, receiving_id: str, tenant_id: str):
        from models.purchase import PurchaseReceiving
        return db.query(PurchaseReceiving).filter(
            PurchaseReceiving.id == receiving_id,
            PurchaseReceiving.tenant_id == tenant_id,
            PurchaseReceiving.is_deleted == False
        ).first()

    # =====================================================================
    # Enterprise Procurement Workflow Additions
    # =====================================================================

    @staticmethod
    def log_timeline(db: Session, tenant_id: str, reference_id: str, reference_type: str, action: str, user_id: str = None, remarks: str = None):
        from models.purchase import PurchaseTimeline
        timeline = PurchaseTimeline(
            tenant_id=tenant_id,
            reference_id=reference_id,
            reference_type=reference_type,
            action=action,
            user_id=user_id,
            remarks=remarks
        )
        db.add(timeline)
        db.commit()

    @staticmethod
    def approve_purchase_request(db: Session, request_id: str, tenant_id: str, user_id: str, user_role: str, status: str, remarks: str = None):
        from models.purchase import PurchaseRequest, PurchaseApprovalMatrix
        from services.system_service import SystemService
        
        req = db.query(PurchaseRequest).filter(
            PurchaseRequest.id == request_id,
            PurchaseRequest.tenant_id == tenant_id,
            PurchaseRequest.is_deleted == False
        ).first()
        
        if not req:
            raise HTTPException(status_code=404, detail="Purchase Request not found")
        if req.status != "Pending" and req.status != "Draft":
            raise HTTPException(status_code=400, detail=f"Cannot approve request in status: {req.status}")
            
        # Calculate approximate total
        # In a real scenario we'd join items and medicines. Let's assume a generic check for now.
        # Alternatively, we just check if the user's role is in the matrix.
        
        PurchaseService.log_timeline(db, tenant_id, req.id, "PurchaseRequest", status, user_id, remarks)
        
        # Dispatch notification to requestor
        try:
            sys_svc = SystemService(db)
            sys_svc.create_notification(
                tenant_id=tenant_id,
                user_id=req.requested_by,
                title=f"Purchase Request {status}",
                message=f"Your request {req.request_number} was {status}.",
                type="info",
                link=f"/purchase/requests/{req.id}"
            )
        except Exception as e:
            pass # ignore notification errors
            
        # Log to Audit (simulated by Timeline for now, or real audit_listener if table exists)
        # Assuming core.audit handles DB events automatically via sqlalchemy events
        
        return req

    @staticmethod
    def convert_request_to_po(db: Session, request_id: str, tenant_id: str, branch_id: str, user_id: str):
        from models.purchase import PurchaseRequest, PurchaseOrder, POItem
        
        req = db.query(PurchaseRequest).filter(
            PurchaseRequest.id == request_id,
            PurchaseRequest.tenant_id == tenant_id,
            PurchaseRequest.is_deleted == False
        ).first()
        
        if not req:
            raise HTTPException(status_code=404, detail="Purchase Request not found")
        if req.status != "Approved":
            raise HTTPException(status_code=400, detail="Only Approved requests can be converted")
            
        # Find the winning quotation or just pick a default supplier
        from models.purchase import PurchaseQuotation
        quot = db.query(PurchaseQuotation).filter(
            PurchaseQuotation.request_id == request_id,
            PurchaseQuotation.status == "Accepted",
            PurchaseQuotation.tenant_id == tenant_id
        ).first()
        
        if not quot:
            # Fallback to first drafted quotation or raise error. We'll fallback to a dummy or raise error.
            raise HTTPException(status_code=400, detail="No Accepted Quotation found for this request. Please accept a quotation first.")
            
        order_num = f"PO-{uuid.uuid4().hex[:6].upper()}"
        db_po = PurchaseOrder(
            order_number=order_num,
            supplier_id=quot.supplier_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            expected_delivery_date=date.today(),
            total_amount=quot.total_amount,
            status="Draft",
            reference_number=req.request_number,
            purchase_source="Request"
        )
        db.add(db_po)
        db.commit()
        db.refresh(db_po)
        
        for item in quot.items:
            db_item = POItem(
                po_id=db_po.id,
                medicine_id=item.medicine_id,
                quantity_ordered=item.quantity,
                unit_price=item.unit_price,
                tenant_id=tenant_id
            )
            db.add(db_item)
            
        req.status = "PO Created"
        db.commit()
        db.refresh(db_po)
        
        PurchaseService.log_timeline(db, tenant_id, req.id, "PurchaseRequest", "Converted to PO", user_id, f"PO ID: {db_po.id}")
        PurchaseService.log_timeline(db, tenant_id, db_po.id, "PurchaseOrder", "Created from Request", user_id, f"Request ID: {req.id}")
        
        return db_po
