from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.users import User
from dependencies.auth import require_role
from schemas.compliance import AuditLogResponse, RetentionPolicyUpdate
from services.compliance_service import ComplianceService

router = APIRouter()

def require_compliance_view(current_user: User = Depends(require_role("compliance.view"))): return current_user

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_compliance_view)):
    return ComplianceService(db).get_audit_logs(current_user.tenant_id, limit)

@router.get("/sensitive-actions", response_model=List[AuditLogResponse])
def get_sensitive_actions(db: Session = Depends(get_db), current_user: User = Depends(require_compliance_view)):
    return ComplianceService(db).get_sensitive_actions(current_user.tenant_id)

@router.put("/retention")
def update_retention(obj_in: RetentionPolicyUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_compliance_view)):
    return ComplianceService(db).update_retention_policy(current_user.tenant_id, obj_in)
