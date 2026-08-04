from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from core.deps import requires_permission
from schemas.system import BackupHistoryResponse, OCRQueueResponse, SystemHealthResponse
from services.system_service import SystemService
from services.system_ops_service import SystemOpsService
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


# ── Health & footprint ────────────────────────────────────────────────────────

@router.get("/health", response_model=SystemHealthResponse)
def get_health(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_system_admin)):
    """Live metrics measured from the running process, disk and database."""
    return SystemOpsService(db).health()


@router.get("/data-footprint")
def get_data_footprint(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_system_admin)):
    """Row counts for the tables that hold real business data."""
    return SystemOpsService(db).data_footprint()


# ── Backups ───────────────────────────────────────────────────────────────────

@router.get("/backups", response_model=List[BackupHistoryResponse])
def get_backups(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemService(db).get_backups(scope.tenant_id)


@router.post("/backups/trigger", response_model=BackupHistoryResponse)
def trigger_backup(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    """Takes a real, consistent copy of the database file."""
    try:
        return SystemOpsService(db).create_backup(scope.tenant_id, current_user.id)
    except RuntimeError as e:
        raise HTTPException(400, str(e))


@router.get("/backups/{backup_id}/download")
def download_backup(backup_id: str, db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    from models.system import BackupHistory
    rec = (db.query(BackupHistory)
           .filter(BackupHistory.id == backup_id, BackupHistory.tenant_id == scope.tenant_id)
           .first())
    if not rec:
        raise HTTPException(404, "Backup not found.")
    try:
        path = SystemOpsService(db).backup_file_path(rec.file_name)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(404, str(e))
    return FileResponse(path, filename=rec.file_name, media_type="application/octet-stream")


@router.delete("/backups/{backup_id}", status_code=204)
def delete_backup(backup_id: str, db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    try:
        SystemOpsService(db).delete_backup(scope.tenant_id, backup_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/backups/prune")
def prune_backups(body: dict = Body(default={}), db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    """Delete backups older than the retention window."""
    svc = SystemOpsService(db)
    keep = int(body.get("keep_days") or svc.get_automation(scope.tenant_id)["backup_retention_days"])
    removed = svc.prune_backups(scope.tenant_id, keep)
    return {"removed": removed, "keep_days": keep}


# ── Maintenance ───────────────────────────────────────────────────────────────

@router.post("/maintenance/vacuum")
def run_vacuum(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage)):
    """Compact the database file and report the space actually reclaimed."""
    try:
        return SystemOpsService(db).vacuum()
    except RuntimeError as e:
        raise HTTPException(400, str(e))


@router.post("/maintenance/cleanup")
def run_cleanup(body: dict = Body(default={}), db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    """Prune old sessions, login history, activity logs and notifications."""
    svc = SystemOpsService(db)
    keep = int(body.get("keep_days") or svc.get_automation(scope.tenant_id)["log_retention_days"])
    return {"keep_days": keep, "results": svc.cleanup_logs(keep)}


# ── Automation ────────────────────────────────────────────────────────────────

@router.get("/automation")
def get_automation(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_system_admin), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemOpsService(db).get_automation(scope.tenant_id)


@router.patch("/automation")
def update_automation(body: dict = Body(...), db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_backup_manage), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemOpsService(db).update_automation(scope.tenant_id, body)


# ── OCR queue ─────────────────────────────────────────────────────────────────

@router.get("/ocr-queue", response_model=List[OCRQueueResponse])
def get_ocr_queue(db: Session = Depends(get_db), current_user: PayloadUser = Depends(require_system_admin), scope: PharmacyScope = Depends(get_pharmacy_scope)):
    return SystemService(db).get_ocr_queue(scope.tenant_id)
