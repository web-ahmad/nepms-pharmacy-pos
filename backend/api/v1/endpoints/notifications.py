from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.users import User
from core.deps import requires_permission
from schemas.system import NotificationResponse
from services.system_service import SystemService
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

class PayloadUser:
    def __init__(self, payload: dict):
        self.id = payload.get("sub")
        self.tenant_id = payload.get("tenant_id")
        self.branch_id = payload.get("branch_id")
        self.payload = payload

# Notifications are usually readable by anyone for their own, or system.admin for all
def require_auth(token_payload: dict = Depends(requires_permission(""))): return PayloadUser(token_payload)

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_auth),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return SystemService(db).get_notifications(scope.tenant_id, current_user.id)

@router.put("/{id}/read", response_model=NotificationResponse)
def mark_read(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_auth),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    return SystemService(db).mark_notification_read(scope.tenant_id, id)

@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_auth),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    SystemService(db).mark_all_notifications_read(scope.tenant_id, current_user.id)
    return {"status": "success"}

@router.delete("/clear-all")
def clear_all(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_auth),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    SystemService(db).clear_all_notifications(scope.tenant_id, current_user.id)
    return {"status": "success"}

@router.delete("/{id}")
def delete_notification(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_auth),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    SystemService(db).delete_notification(scope.tenant_id, id)
    return {"status": "success"}

@router.post("/seed")
def seed_notifications(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_auth),
    scope: PharmacyScope = Depends(get_pharmacy_scope)
):
    SystemService(db).seed_mock_notifications(scope.tenant_id, current_user.id)
    return {"status": "success"}
