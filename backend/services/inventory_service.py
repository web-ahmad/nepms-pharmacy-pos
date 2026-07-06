from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List
from models.inventory import Batch, StockMovement, Medicine
from repositories.inventory import batch_repo

class InventoryService:
    @staticmethod
    def allocate_fefo(db: Session, tenant_id: str, branch_id: str, medicine_id: str, quantity_required: int, user_id: str, reference_id: str, movement_type: str = "Sale", preferred_batch_id: str = None):
        """
        Production-grade FEFO allocation logic.
        Allocates stock from earliest expiring valid batches.
        Logs every allocation into stock movements.
        """
        # Debug logging
        try:
            with open("fefo_debug.log", "a") as f:
                f.write(f"\n--- FEFO ALLOCATION START ---\n")
                f.write(f"tenant_id: {tenant_id!r}\n")
                f.write(f"branch_id: {branch_id!r}\n")
                f.write(f"medicine_id: {medicine_id!r}\n")
                f.write(f"quantity_required: {quantity_required!r}\n")
                f.write(f"user_id: {user_id!r}\n")
                f.write(f"reference_id: {reference_id!r}\n")
                f.write(f"movement_type: {movement_type!r}\n")
                f.write(f"preferred_batch_id: {preferred_batch_id!r}\n")
        except Exception as log_err:
            print("Log error:", log_err)

        batches = batch_repo.get_active_batches_for_medicine(db, tenant_id, branch_id, medicine_id)
        
        if preferred_batch_id:
            batches.sort(key=lambda b: (0 if b.id == preferred_batch_id else 1, b.expiry_date))

        try:
            with open("fefo_debug.log", "a") as f:
                f.write(f"Found active batches count: {len(batches)}\n")
                for i, b in enumerate(batches):
                    f.write(f"  Batch {i+1}: {b.batch_number} (qty: {b.current_quantity}, reserved: {b.reserved_quantity}, status: {b.status}, expiry: {b.expiry_date})\n")
        except Exception as log_err:
            print("Log error:", log_err)
        
        remaining_qty = quantity_required
        allocation_logs = []
        
        for batch in batches:
            if remaining_qty <= 0:
                break
                
            available = batch.current_quantity - batch.reserved_quantity
            qty_to_take = min(available, remaining_qty)
            
            # Deduct from batch
            batch.current_quantity -= qty_to_take
            remaining_qty -= qty_to_take
            db.add(batch)
            
            # Log movement
            movement = StockMovement(
                tenant_id=tenant_id,
                branch_id=branch_id,
                medicine_id=medicine_id,
                batch_id=batch.id,
                user_id=user_id,
                movement_type=movement_type,
                quantity_change=-qty_to_take,
                balance_after=batch.current_quantity,
                reference_id=reference_id,
                notes=f"FEFO Auto-allocation for {movement_type}"
            )
            db.add(movement)
            allocation_logs.append({
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "quantity_taken": qty_to_take
            })
            
        if remaining_qty > 0:
            try:
                with open("fefo_debug.log", "a") as f:
                    f.write(f"RAISING ERROR: Insufficient stock. Short by {remaining_qty}\n")
            except Exception as log_err:
                print("Log error:", log_err)
            raise ValueError(f"Insufficient stock for medicine_id: {medicine_id}. Short by {remaining_qty}")
            
        # Do not commit here! Let the caller manage the transaction to ensure atomicity.
        return allocation_logs

    @staticmethod
    def get_expiring_batches(db: Session, tenant_id: str, branch_id: str, days: int):
        target_date = date.today() + timedelta(days=days)
        
        batches = db.query(Batch).filter(
            Batch.tenant_id == tenant_id,
            Batch.branch_id == branch_id,
            Batch.is_deleted == False,
            Batch.current_quantity > 0,
            Batch.expiry_date <= target_date,
            Batch.expiry_date >= date.today()
        ).order_by(Batch.expiry_date.asc()).all()
        
        results = []
        for b in batches:
            results.append({
                "batch_id": b.id,
                "batch_number": b.batch_number,
                "medicine_name": b.medicine.name if b.medicine else "Unknown",
                "expiry_date": b.expiry_date,
                "days_to_expiry": (b.expiry_date - date.today()).days,
                "current_quantity": b.current_quantity,
                "inventory_value": b.current_quantity * b.purchase_price
            })
        return results

    @staticmethod
    def get_low_stock(db: Session, tenant_id: str, branch_id: str, skip: int = 0, limit: int = 100, category_id: str = None, supplier_id: str = None, severity: str = None, search: str = None):
        from sqlalchemy import func, case, or_
        from models.inventory import Medicine, Batch, Category
        from models.purchase import Supplier
        
        # Calculate total stock per medicine
        stock_subquery = db.query(
            Batch.medicine_id,
            func.sum(Batch.current_quantity).label('total_stock')
        ).filter(
            Batch.tenant_id == tenant_id,
            Batch.branch_id == branch_id,
            Batch.is_deleted == False
        ).group_by(Batch.medicine_id).subquery()

        query = db.query(Medicine, stock_subquery.c.total_stock, Category).outerjoin(
            stock_subquery, Medicine.id == stock_subquery.c.medicine_id
        ).outerjoin(Category, Medicine.category_id == Category.id).filter(
            Medicine.tenant_id == tenant_id,
            Medicine.is_deleted == False
        )
        
        # Filter for low stock (total_stock <= min_stock_level)
        query = query.filter(
            or_(
                stock_subquery.c.total_stock <= Medicine.min_stock_level,
                stock_subquery.c.total_stock == None
            ),
            Medicine.min_stock_level > 0
        )
        
        if category_id:
            query = query.filter(Medicine.category_id == category_id)
            
        if search:
            query = query.filter(or_(
                Medicine.name.ilike(f"%{search}%"),
                Medicine.generic_name.ilike(f"%{search}%")
            ))
            
        results = query.all()
        
        alerts = []
        for med, total_stock, cat in results:
            stock = total_stock or 0
            
            # Calculate Severity
            if stock <= med.min_stock_level / 2:
                calc_severity = "Critical"
            else:
                calc_severity = "Warning"
                
            if severity and calc_severity != severity:
                continue
                
            # Find supplier of most recently received active batch
            latest_batch = db.query(Batch).filter(
                Batch.medicine_id == med.id,
                Batch.branch_id == branch_id,
                Batch.tenant_id == tenant_id,
                Batch.is_deleted == False,
                Batch.supplier_id != None
            ).order_by(Batch.created_at.desc()).first()
            
            sup_id = latest_batch.supplier_id if latest_batch else None
            sup_name = latest_batch.supplier.name if latest_batch and latest_batch.supplier else None
            batch_num = latest_batch.batch_number if latest_batch else None
            
            if supplier_id and sup_id != supplier_id:
                continue
                
            alerts.append({
                "medicine_id": med.id,
                "medicine_name": med.name,
                "generic_name": med.generic_name,
                "batch_info": batch_num,
                "current_stock": stock,
                "min_stock_level": med.min_stock_level,
                "safety_threshold": med.max_stock_level or (med.min_stock_level * 2),
                "suggested_reorder": max(0, (med.max_stock_level or (med.min_stock_level * 2)) - stock),
                "supplier_name": sup_name,
                "supplier_id": sup_id,
                "category_name": cat.name if cat else None,
                "severity": calc_severity
            })
            
        # Sort and paginate
        alerts.sort(key=lambda x: (x["severity"] == "Warning", x["current_stock"] / (x["min_stock_level"] or 1)))
        
        total = len(alerts)
        paginated_alerts = alerts[skip:skip+limit]
        
        return {
            "total": total,
            "items": paginated_alerts,
            "page": (skip // limit) + 1 if limit else 1,
            "size": limit
        }
