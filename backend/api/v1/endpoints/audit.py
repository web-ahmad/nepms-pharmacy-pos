from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, datetime

from database import get_db
from models.users import User
from api.v1.endpoints.auth import get_current_user
from schemas.reports import DateRangeParams
from schemas.audit import SystemAuditLogResponse
from services.audit_service import AuditService

router = APIRouter()

def require_audit_view(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/logs", response_model=List[SystemAuditLogResponse])
def get_audit_logs(
    start_date: date,
    end_date: date,
    tab: str = Query("General Activity", description="Filter by UI tab category"),
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_audit_view)
):
    service = AuditService(db)
    
    # Map tabs to entity_types based on forensic logic
    entity_types = []
    if tab == "General Activity":
        entity_types = ["Medicine", "Batch", "Supplier", "Category", "System"]
    elif tab == "Security & Access":
        entity_types = ["User", "Role", "Permission", "Login"]
    elif tab == "Financial & POS Fraud":
        entity_types = ["Sale", "SaleReturn", "Payment", "Discount", "Void", "Invoice"]
    elif tab == "HR & System":
        entity_types = ["Employee", "Payroll", "Attendance", "Tax", "Settings"]
    elif tab == "Data Privacy":
        entity_types = ["Customer", "Export", "Report"]
        
    params = DateRangeParams(start_date=start_date, end_date=end_date)
    
    return service.get_audit_logs(
        tenant_id=current_user.tenant_id,
        params=params,
        entity_types=entity_types if entity_types else None,
        severity=severity,
        user_id=user_id
    )
