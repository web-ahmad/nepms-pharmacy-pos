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
                    trade_price = med.purchase_price or 0.0
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
                medicine.purchase_price = item.purchase_price
                if getattr(item, 'apply_to_old_stock', False):
                    medicine.sale_price = item.selling_price
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
        if payment.invoice_id:
            inv = db.query(PurchaseInvoice).filter(PurchaseInvoice.id == payment.invoice_id).first()
            if inv:
                inv.amount_paid += payment.amount
                inv.status = "Paid" if inv.amount_paid >= inv.total_amount else "Partial"
                db.add(inv)

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
        db.commit()
        db.refresh(payment)
        return payment
