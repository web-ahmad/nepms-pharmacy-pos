"""
api/v1/endpoints/super_admin_settings.py
──────────────────────────────────────────
Global platform settings (singleton). Super-admin only.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from api.v1.endpoints.super_admin import require_super_admin, _get_db
from models.platform import PlatformSettings

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PlatformSettingsRequest(BaseModel):
    platform_name: str = "NEPMS"
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = None
    default_currency_code: Optional[str] = None
    maintenance_mode: bool = False
    maintenance_message: Optional[str] = None
    feature_flags: Optional[dict] = None


def _settings_dict(s: PlatformSettings) -> dict:
    return {
        "id": s.id,
        "platform_name": s.platform_name,
        "support_email": s.support_email,
        "support_phone": s.support_phone,
        "default_currency_code": s.default_currency_code,
        "maintenance_mode": s.maintenance_mode,
        "maintenance_message": s.maintenance_message,
        "feature_flags": s.feature_flags or {},
    }


def _get_or_create_settings(db: Session) -> PlatformSettings:
    settings = db.query(PlatformSettings).filter(PlatformSettings.is_deleted == False).first()
    if not settings:
        settings = PlatformSettings(platform_name="NEPMS")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ── GET /super-admin/settings ──────────────────────────────────────────────────

@router.get("/settings")
def get_platform_settings(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    return _settings_dict(_get_or_create_settings(db))


# ── PUT /super-admin/settings ──────────────────────────────────────────────────

@router.put("/settings")
def update_platform_settings(
    body: PlatformSettingsRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    settings = _get_or_create_settings(db)
    data = body.model_dump()
    data["support_email"] = str(data["support_email"]) if data.get("support_email") else None
    for field, value in data.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return _settings_dict(settings)
