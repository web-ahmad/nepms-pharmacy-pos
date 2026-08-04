from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.users import User
from core.deps import requires_permission, get_current_user
from schemas.settings import (
    TenantSettingsUpdate, TenantSettingsResponse,
    SystemModuleResponse, SystemModuleUpdate,
    InvoiceSettingsResponse, InvoiceSettingsUpdate
)
from services.settings_service import SettingsService
from typing import List
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope
import os, uuid, shutil

router = APIRouter()

# Logos are stored under storage/ which is the only statically-mounted dir
# (served at /storage/... — see main.py), so uploaded logos are web-accessible.
LOGO_DIR = os.path.join(os.getcwd(), "storage", "logos")
os.makedirs(LOGO_DIR, exist_ok=True)
ALLOWED_LOGO_EXT = {"png", "jpg", "jpeg", "webp", "gif", "svg"}

def require_settings_view(token_payload: dict = Depends(requires_permission("settings:view"))): return token_payload
def require_settings_update(token_payload: dict = Depends(requires_permission("settings:update"))): return token_payload

@router.post("/logo")
def upload_company_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_settings_update),
):
    """Upload a company logo, persist its URL into company_settings.logo_url, and
    return the URL. The logo then shows on receipts and reports."""
    ext = (file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png")
    if ext not in ALLOWED_LOGO_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported image type '.{ext}'. Use PNG, JPG, WEBP, GIF or SVG.")

    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(LOGO_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    logo_url = f"/storage/logos/{filename}"

    # Merge into the existing company_settings JSON blob (don't clobber siblings).
    svc = SettingsService(db)
    tenant_id = current_user.get("tenant_id")
    settings = svc.get_settings(tenant_id)
    company = dict(settings.company_settings or {})
    company["logo_url"] = logo_url
    svc.update_settings(tenant_id, TenantSettingsUpdate(company_settings=company))

    return {"logo_url": logo_url}

@router.get("", response_model=TenantSettingsResponse)
def get_settings(db: Session = Depends(get_db), current_user: dict = Depends(require_settings_view)):
    return SettingsService(db).get_settings(current_user.get("tenant_id"))

@router.put("", response_model=TenantSettingsResponse)
def update_settings(obj_in: TenantSettingsUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_settings_update)):
    return SettingsService(db).update_settings(current_user.get("tenant_id"), obj_in)

@router.get("/company-identity")
def get_company_identity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Just the company's letterhead details (name, logo, address, contact).

    Every authenticated user needs this to print a document they're entitled to
    — e.g. an employee printing their own payslip — so it isn't gated behind
    settings:view like the full settings blob. Deliberately returns ONLY these
    identity fields, never POS/tax/HR configuration.
    """
    settings_obj = SettingsService(db).get_settings(current_user.tenant_id)
    company = (getattr(settings_obj, "company_settings", None) or {}) if settings_obj else {}
    allowed = (
        "name", "logo_url", "address", "city", "country",
        "phone", "email", "website", "tax_number", "registration_number",
    )
    return {k: company.get(k) for k in allowed}


@router.get("/invoice", response_model=InvoiceSettingsResponse)
def get_invoice_settings(db: Session = Depends(get_db), current_user: dict = Depends(require_settings_view)):
    return SettingsService(db).get_invoice_settings(current_user.get("tenant_id"))

@router.put("/invoice", response_model=InvoiceSettingsResponse)
def update_invoice_settings(obj_in: InvoiceSettingsUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_settings_update)):
    return SettingsService(db).update_invoice_settings(current_user.get("tenant_id"), obj_in)

@router.get("/modules", response_model=List[SystemModuleResponse])
def get_modules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Read-only "which features are on" info — every authenticated user needs
    # this (it drives the sidebar's module gating for ALL roles), not just
    # settings:view holders. Only /modules/{id} PUT (the actual toggle) stays
    # restricted to require_settings_update below.
    return SettingsService(db).get_modules(current_user.tenant_id)

@router.put("/modules/{id}", response_model=SystemModuleResponse)
def update_module(id: str, obj_in: SystemModuleUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_settings_update)):
    return SettingsService(db).update_module(current_user.get("tenant_id"), id, current_user.get("sub"), obj_in)

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
