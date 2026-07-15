from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.users import User
from dependencies.auth import require_role
from schemas.settings import (
    TenantSettingsUpdate, TenantSettingsResponse, 
    SystemModuleResponse, SystemModuleUpdate,
    InvoiceSettingsResponse, InvoiceSettingsUpdate
)
from services.settings_service import SettingsService
from typing import List
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter()

def require_settings_view(current_user: User = Depends(require_role("settings.view"))): return current_user
def require_settings_update(current_user: User = Depends(require_role("settings.update"))): return current_user

@router.get("", response_model=TenantSettingsResponse)
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(require_settings_view)):
    return SettingsService(db).get_settings(current_user.tenant_id)

@router.put("", response_model=TenantSettingsResponse)
def update_settings(obj_in: TenantSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_settings_update)):
    return SettingsService(db).update_settings(current_user.tenant_id, obj_in)

@router.get("/invoice", response_model=InvoiceSettingsResponse)
def get_invoice_settings(db: Session = Depends(get_db), current_user: User = Depends(require_settings_view)):
    return SettingsService(db).get_invoice_settings(current_user.tenant_id)

@router.put("/invoice", response_model=InvoiceSettingsResponse)
def update_invoice_settings(obj_in: InvoiceSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_settings_update)):
    return SettingsService(db).update_invoice_settings(current_user.tenant_id, obj_in)

@router.get("/modules", response_model=List[SystemModuleResponse])
def get_modules(db: Session = Depends(get_db), current_user: User = Depends(require_settings_view)):
    return SettingsService(db).get_modules(current_user.tenant_id)

@router.put("/modules/{id}", response_model=SystemModuleResponse)
def update_module(id: str, obj_in: SystemModuleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_settings_update)):
    return SettingsService(db).update_module(current_user.tenant_id, id, current_user.id, obj_in)

@router.get("/whatsapp/qr")
def get_whatsapp_qr(current_user: User = Depends(require_settings_view)):
    import requests
    try:
        response = requests.get("http://localhost:3001/qr", timeout=5)
        if response.status_code == 200:
            return response.json()
        return {"connected": False, "qr": None, "error": "Microservice error"}
    except requests.exceptions.RequestException:
        return {"connected": False, "qr": None, "error": "WhatsApp microservice is offline"}
