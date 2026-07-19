from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.users import User
from core.deps import requires_permission
from schemas.system import BackupHistoryResponse, OCRQueueResponse, SystemHealthResponse
from services.system_service import SystemService
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

class PayloadUser:
    def __init__(self, payload: dict):
        self.id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id")
        self.branch_id = payload.get("branch_id")
        self.payload = payload

def require_system_admin(token_payload: dict = Depends(requires_permission("system_health:view"))): return PayloadUser(token_payload)
def require_backup_manage(token_payload: dict = Depends(requires_permission("backup:manage"))): return PayloadUser(token_payload)

@router.get("/health", response_model=SystemHealthResponse)
def get_health(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_system_admin)):
    return SystemService(db).get_system_health()

@router.get("/backups", response_model=List[BackupHistoryResponse])
def get_backups(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemService(db).get_backups(scope.tenant_id)

@router.post("/backups/trigger", response_model=BackupHistoryResponse)
def trigger_backup(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemService(db).trigger_backup(scope.tenant_id, current_user.id)

@router.get("/ocr-queue", response_model=List[OCRQueueResponse])
def get_ocr_queue(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_system_admin), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemService(db).get_ocr_queue(scope.tenant_id)
