from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
import uuid
from models.inventory import AuditSession, AuditItem, Medicine, Batch, StockAdjustment, StockMovement
from models.users import User
from schemas.audit import AuditSessionCreate, AuditSessionUpdate, UpdatePhysicalCount, AuditItemResponse, AuditSessionResponse

def create_audit_session(db: Session, data: AuditSessionCreate, tenant_id: str, branch_id: str, user_id: str) -> AuditSession:
    session = AuditSession(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        branch_id=branch_id,
        created_by=user_id,
        name=data.name,
        scope_type=data.scope_type,
        scope_value=data.scope_value,
        is_blind=data.is_blind,
        notes=data.notes,
        start_date=datetime.now(timezone.utc),
        status="In Progress"
    )
    db.add(session)
    db.flush()

    # Populate audit items based on scope
    query = db.query(Medicine, Batch).outerjoin(Batch, Medicine.id == Batch.medicine_id)
    
    if data.scope_type == "Category":
        from models.inventory import Category
        query = query.join(Category, Medicine.category_id == Category.id).filter(Category.name.ilike(f"%{data.scope_value}%"))
    elif data.scope_type == "Location":
        locations = [l.strip() for l in data.scope_value.split(",") if l.strip()]
        if locations:
            from sqlalchemy import or_
            conditions = []
            for loc in locations:
                conditions.append(Medicine.shelf.ilike(f"%{loc}%"))
                conditions.append(Medicine.last_location.ilike(f"%{loc}%"))
            query = query.filter(or_(*conditions))

    results = query.all()
    
    processed = set()
    
    for med, batch in results:
        if batch and batch.status == "Active" and not getattr(batch, 'is_deleted', False):
            key = f"{med.id}_{batch.id}"
            if key not in processed:
                item = AuditItem(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    medicine_id=med.id,
                    batch_id=batch.id,
                    system_quantity=batch.available_quantity,
                    physical_count=None,
                    unit_price=batch.purchase_price or med.cost_per_base_unit or 0.0
                )
                db.add(item)
                processed.add(key)
        elif not batch:
            key = f"{med.id}_None"
            if key not in processed:
                item = AuditItem(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    medicine_id=med.id,
                    batch_id=None,
                    system_quantity=0,
                    physical_count=None,
                    unit_price=med.cost_per_base_unit or 0.0
                )
                db.add(item)
                processed.add(key)

    db.commit()
    db.refresh(session)
    return session

def get_audit_sessions(db: Session, tenant_id: str, branch_id: str):
    return db.query(AuditSession).filter(
        AuditSession.tenant_id == tenant_id,
        AuditSession.branch_id == branch_id
    ).order_by(AuditSession.created_at.desc()).all()

def get_audit_session(db: Session, session_id: str, tenant_id: str) -> AuditSession:
    return db.query(AuditSession).filter(
        AuditSession.id == session_id,
        AuditSession.tenant_id == tenant_id
    ).first()

def update_physical_count(db: Session, session_id: str, item_id: str, physical_count: int, tenant_id: str, user_id: str):
    item = db.query(AuditItem).filter(
        AuditItem.id == item_id,
        AuditItem.session_id == session_id
    ).first()
    
    if item:
        item.physical_count = physical_count
        # Calculate variance ONLY — never touch actual stock here
        item.variance = physical_count - item.system_quantity
        db.commit()
        db.refresh(item)
    return item

def submit_audit_session(db: Session, session_id: str, tenant_id: str):
    session = get_audit_session(db, session_id, tenant_id)
    if session:
        session.status = "Pending Approval"
        db.commit()
        db.refresh(session)
    return session

def reconcile_audit_session(db: Session, session_id: str, tenant_id: str, user_id: str):
    session = get_audit_session(db, session_id, tenant_id)
    if not session or session.status == "Completed":
        return session
    
    for item in session.items:
        if item.physical_count is not None and item.variance != 0:
            qty_adjusted = item.variance
            
            if item.batch_id:
                batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
                if batch:
                    balance_before = batch.current_quantity
                    batch.current_quantity = item.physical_count
                    
                    adjustment = StockAdjustment(
                        id=str(uuid.uuid4()),
                        batch_id=item.batch_id,
                        branch_id=session.branch_id,
                        user_id=user_id,
                        quantity_adjusted=qty_adjusted,
                        reason=f"Audit Reconciliation for session {session.name}"
                    )
                    db.add(adjustment)
                    
                    mov_type = "Adjustment Increase" if qty_adjusted > 0 else "Adjustment Decrease"
                    movement = StockMovement(
                        id=str(uuid.uuid4()),
                        medicine_id=item.medicine_id,
                        batch_id=item.batch_id,
                        branch_id=session.branch_id,
                        user_id=user_id,
                        movement_type=mov_type,
                        quantity_change=qty_adjusted,
                        balance_after=batch.current_quantity,
                        reference_id=adjustment.id,
                        notes="Audit Sync"
                    )
                    db.add(movement)
    
    session.status = "Completed"
    session.completion_date = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session

def sync_audit_session_items(db: Session, session_id: str, tenant_id: str):
    session = get_audit_session(db, session_id, tenant_id)
    if not session or session.status in ["Completed", "Under Review"]:
        return session
    
    query = db.query(Medicine, Batch).outerjoin(Batch, Medicine.id == Batch.medicine_id)
    
    if session.scope_type == "Category":
        from models.inventory import Category
        query = query.join(Category, Medicine.category_id == Category.id).filter(Category.name.ilike(f"%{session.scope_value}%"))
    elif session.scope_type == "Location":
        locations = [l.strip() for l in session.scope_value.split(",") if l.strip()]
        if locations:
            from sqlalchemy import or_
            conditions = []
            for loc in locations:
                conditions.append(Medicine.shelf.ilike(f"%{loc}%"))
                conditions.append(Medicine.last_location.ilike(f"%{loc}%"))
            query = query.filter(or_(*conditions))
        
    results = query.all()
    
    # Existing keys
    processed = {f"{item.medicine_id}_{item.batch_id or 'None'}" for item in session.items}
    added_count = 0
    
    for med, batch in results:
        if batch and batch.status == "Active" and not getattr(batch, 'is_deleted', False):
            key = f"{med.id}_{batch.id}"
            if key not in processed:
                item = AuditItem(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    medicine_id=med.id,
                    batch_id=batch.id,
                    system_quantity=batch.available_quantity,
                    physical_count=None,
                    unit_price=batch.purchase_price or med.cost_per_base_unit or 0.0
                )
                db.add(item)
                processed.add(key)
                added_count += 1
        elif not batch:
            key = f"{med.id}_None"
            if key not in processed:
                item = AuditItem(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    medicine_id=med.id,
                    batch_id=None,
                    system_quantity=0,
                    physical_count=None,
                    unit_price=med.cost_per_base_unit or 0.0
                )
                db.add(item)
                processed.add(key)
                added_count += 1
                
    if added_count > 0:
        db.commit()
        db.refresh(session)
        
    return session

def reconcile_single_audit_item(db: Session, session_id: str, item_id: str, tenant_id: str, user_id: str, auto: bool = False):
    session = get_audit_session(db, session_id, tenant_id)
    if not session or session.status == "Completed":
        return None

    item = db.query(AuditItem).filter(
        AuditItem.id == item_id,
        AuditItem.session_id == session_id
    ).first()

    if not item or item.physical_count is None or item.variance == 0:
        return item
        
    qty_adjusted = item.variance
            
    if item.batch_id:
        batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
        if batch:
            batch.current_quantity = item.physical_count
            
            adjustment = StockAdjustment(
                id=str(uuid.uuid4()),
                batch_id=item.batch_id,
                branch_id=session.branch_id,
                user_id=user_id,
                quantity_adjusted=qty_adjusted,
                reason="AUTO_RECONCILED" if auto else f"Single Item Reconciliation for session {session.name}"
            )
            db.add(adjustment)
            
            mov_type = "Adjustment Increase" if qty_adjusted > 0 else "Adjustment Decrease"
            movement = StockMovement(
                id=str(uuid.uuid4()),
                medicine_id=item.medicine_id,
                batch_id=item.batch_id,
                branch_id=session.branch_id,
                user_id=user_id,
                movement_type=mov_type,
                quantity_change=qty_adjusted,
                balance_after=batch.current_quantity,
                reference_id=adjustment.id,
                notes="Audit Item Sync"
            )
            db.add(movement)
            
            # Reset variance after reconciling so it doesn't double-reconcile
            item.system_quantity = item.physical_count
            item.variance = 0
            db.commit()
            db.refresh(item)
            
    return item

