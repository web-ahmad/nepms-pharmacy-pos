from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.users import User
from dependencies.auth import require_role
from schemas.system import NotificationResponse
from services.system_service import SystemService
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

# Notifications are usually readable by anyone for their own, or system.admin for all
def require_auth(current_user: User = Depends(require_role(""))): return current_user

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    return SystemService(db).get_notifications(scope.tenant_id, current_user.id)

@router.put("/{id}/read", response_model=NotificationResponse)
def mark_read(id: str, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    return SystemService(db).mark_notification_read(scope.tenant_id, id)
