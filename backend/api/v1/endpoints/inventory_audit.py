from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from core.deps import get_current_user
from schemas.audit import (
    AuditSessionCreate, AuditSessionUpdate, UpdatePhysicalCount, 
    AuditSessionResponse, AuditItemResponse, AuditSummary
)
from services import inventory_audit_service
from models.users import User
from models.inventory import AuditSession, Medicine
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

@router.get("/racks", response_model=List[str])
def get_available_racks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    """Fetch all unique rack/shelf locations from medicines table."""
    from sqlalchemy import distinct
    shelves = db.query(distinct(Medicine.shelf)).filter(
        Medicine.shelf != None,
        Medicine.shelf != '',
        Medicine.is_deleted == False
    ).all()
    last_locs = db.query(distinct(Medicine.last_location)).filter(
        Medicine.last_location != None,
        Medicine.last_location != '',
        Medicine.is_deleted == False
    ).all()
    
    all_locations = set()
    for (s,) in shelves:
        if s:
            all_locations.add(s.strip())
    for (l,) in last_locs:
        if l:
            all_locations.add(l.strip())
    
    return sorted(all_locations)


@router.post("/sessions", response_model=AuditSessionResponse)
def create_session(
    data: AuditSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    session = inventory_audit_service.create_audit_session(
        db=db,
        data=data,
        tenant_id=scope.tenant_id,
        branch_id=tenant_context.branch_id,
        user_id=current_user.id
    )
    return _format_session_response(session)

@router.get("/sessions", response_model=List[AuditSessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    sessions = inventory_audit_service.get_audit_sessions(
        db=db,
        tenant_id=scope.tenant_id,
        branch_id=tenant_context.branch_id
    )
    return [_format_session_response(s) for s in sessions]

@router.get("/sessions/{session_id}", response_model=AuditSessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    session = inventory_audit_service.get_audit_session(db, session_id, scope.tenant_id)
    if not session:
        raise HTTPException(status_code=404, detail="Audit session not found")
    return _format_session_response(session)

@router.put("/sessions/{session_id}/items/{item_id}")
def update_item_count(
    session_id: str,
    item_id: str,
    data: UpdatePhysicalCount,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    item = inventory_audit_service.update_physical_count(
        db=db,
        session_id=session_id,
        item_id=item_id,
        physical_count=data.physical_count,
        tenant_id=scope.tenant_id,
        user_id=current_user.id
    )
    if not item:
        raise HTTPException(status_code=404, detail="Audit item not found")
    return {"status": "success"}

@router.post("/sessions/{session_id}/items/{item_id}/reconcile", response_model=AuditItemResponse)
def reconcile_item(
    session_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    item = inventory_audit_service.reconcile_single_audit_item(
        db=db,
        session_id=session_id,
        item_id=item_id,
        tenant_id=scope.tenant_id,
        user_id=current_user.id
    )
    if not item:
        raise HTTPException(status_code=404, detail="Audit item not found or already reconciled")
    
    return {
        "id": item.id,
        "medicine_id": item.medicine_id,
        "batch_id": item.batch_id,
        "system_quantity": item.system_quantity,
        "physical_count": item.physical_count,
        "variance": item.variance,
        "unit_price": item.unit_price,
        "medicine_name": item.medicine.name if item.medicine else "Unknown",
        "sku": item.medicine.sku if item.medicine else None,
        "batch_number": item.batch.batch_number if item.batch else None,
        "expiry_date": item.batch.expiry_date.isoformat() if item.batch and item.batch.expiry_date else None
    }

@router.post("/sessions/{session_id}/submit", response_model=AuditSessionResponse)
def submit_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    session = inventory_audit_service.submit_audit_session(db, session_id, scope.tenant_id)
    if not session:
        raise HTTPException(status_code=404, detail="Audit session not found")
    return _format_session_response(session)

@router.post("/sessions/{session_id}/reconcile", response_model=AuditSessionResponse)
def reconcile_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    session = inventory_audit_service.reconcile_audit_session(
        db=db, 
        session_id=session_id, 
        tenant_id=scope.tenant_id,
        user_id=current_user.id
    )
    if not session:
        raise HTTPException(status_code=404, detail="Audit session not found")
    return _format_session_response(session)

@router.post("/sessions/{session_id}/sync", response_model=AuditSessionResponse)
def sync_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    session = inventory_audit_service.sync_audit_session_items(
        db=db, 
        session_id=session_id, 
        tenant_id=scope.tenant_id
    )
    if not session:
        raise HTTPException(status_code=404, detail="Audit session not found")
    return _format_session_response(session)

@router.get("/sessions/{session_id}/summary", response_model=AuditSummary)
def get_session_summary(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    session = inventory_audit_service.get_audit_session(db, session_id, scope.tenant_id)
    if not session:
        raise HTTPException(status_code=404, detail="Audit session not found")
    
    total_variance = 0.0
    total_shrinkage = 0.0
    total_surplus = 0.0
    matched = 0
    missing = 0
    extra = 0
    
    for item in session.items:
        if item.variance == 0:
            matched += 1
        elif item.variance is not None and item.variance < 0:
            missing += 1
            val = item.variance * item.unit_price
            total_shrinkage += val
            total_variance += val
        elif item.variance is not None and item.variance > 0:
            extra += 1
            val = item.variance * item.unit_price
            total_surplus += val
            total_variance += val
            
    return AuditSummary(
        total_variance_value=total_variance,
        total_shrinkage_value=total_shrinkage,
        total_surplus_value=total_surplus,
        matched_items_count=matched,
        missing_items_count=missing,
        extra_items_count=extra
    )

def _format_session_response(session: AuditSession):
    # Prepare items
    formatted_items = []
    for item in session.items:
        formatted_items.append({
            "id": item.id,
            "medicine_id": item.medicine_id,
            "batch_id": item.batch_id,
            "system_quantity": item.system_quantity,
            "physical_count": item.physical_count,
            "variance": item.variance,
            "unit_price": item.unit_price,
            "medicine_name": item.medicine.name if item.medicine else "Unknown",
            "sku": item.medicine.sku if item.medicine else None,
            "batch_number": item.batch.batch_number if item.batch else None,
            "expiry_date": item.batch.expiry_date.isoformat() if item.batch and item.batch.expiry_date else None,
            "dosage_form": item.medicine.dosage_form if item.medicine else None,
            "strength": item.medicine.strength if item.medicine else None,
        })
        
    auditor_name = None
    if session.created_by:
        # Avoid explicit DB lookup here by assuming relationship or ignoring.
        # But for full name we might need a db lookup if not eager loaded.
        pass
        
    return {
        "id": session.id,
        "name": session.name,
        "status": session.status,
        "scope_type": session.scope_type,
        "scope_value": session.scope_value,
        "is_blind": session.is_blind,
        "notes": session.notes,
        "start_date": session.start_date,
        "completion_date": session.completion_date,
        "created_by": session.created_by,
        "auditor_name": auditor_name,
        "items": formatted_items
    }
