from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.users import User
from core.deps import requires_permission
from schemas.compliance import AuditLogResponse, RetentionPolicyUpdate
from services.compliance_service import ComplianceService
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

class PayloadUser:
    def __init__(self, payload: dict):
        self.id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id")
        self.branch_id = payload.get("branch_id")
        self.payload = payload

def require_compliance_view(token_payload: dict = Depends(requires_permission("compliance:view"))): return PayloadUser(token_payload)

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_compliance_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return ComplianceService(db).get_audit_logs(scope.tenant_id, limit)

@router.get("/sensitive-actions", response_model=List[AuditLogResponse])
def get_sensitive_actions(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_compliance_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return ComplianceService(db).get_sensitive_actions(scope.tenant_id)

@router.put("/retention")
def update_retention(obj_in: RetentionPolicyUpdate, db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_compliance_view), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return ComplianceService(db).update_retention_policy(scope.tenant_id, obj_in)
