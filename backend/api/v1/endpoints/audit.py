from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from database import get_db
from models.users import User
from api.v1.endpoints.auth import get_current_user
from schemas.reports import DateRangeParams
from services.audit_service import AuditService

router = APIRouter()

def require_audit_view(current_user: User = Depends(get_current_user)):
    if "audit.view" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.get("/activity")
def get_activity_audit(
    start_date: date,
    end_date: date,
    entity_type: Optional[str] = None,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit_view)
):
    if export and "audit.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = AuditService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_audit_logs(current_user.tenant_id, params, entity_type)

@router.get("/security")
def get_security_audit(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit_view)
):
    if export and "audit.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = AuditService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_security_audit(current_user.tenant_id, params)

@router.get("/inventory")
def get_inventory_audit(
    start_date: date,
    end_date: date,
    export: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit_view)
):
    if export and "audit.export" not in current_user.permissions and current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to export")
        
    service = AuditService(db)
    params = DateRangeParams(start_date=start_date, end_date=end_date, export_format=export)
    return service.get_inventory_audit(current_user.tenant_id, params)
