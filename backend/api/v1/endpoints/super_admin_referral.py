"""
api/v1/endpoints/super_admin_referral.py
──────────────────────────────────────────
Platform-level Referral Program settings + referral tracking. Super-admin only.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from api.v1.endpoints.super_admin import require_super_admin, _get_db
from models.platform import ReferralProgramSettings, PharmacyReferral
from models.users import Pharmacy

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ReferralSettingsRequest(BaseModel):
    reward_type: str = "percentage"
    reward_value: float = 0
    reward_duration_months: Optional[int] = None
    is_active: bool = True
    terms: Optional[str] = None

    @field_validator("reward_type")
    @classmethod
    def validate_type(cls, v):
        allowed = {"percentage", "fixed"}
        if v not in allowed:
            raise ValueError(f"reward_type must be one of {allowed}")
        return v


def _settings_dict(s: ReferralProgramSettings) -> dict:
    return {
        "id": s.id,
        "reward_type": s.reward_type,
        "reward_value": float(s.reward_value) if s.reward_value is not None else 0,
        "reward_duration_months": s.reward_duration_months,
        "is_active": s.is_active,
        "terms": s.terms,
    }


def _get_or_create_settings(db: Session) -> ReferralProgramSettings:
    settings = db.query(ReferralProgramSettings).filter(
        ReferralProgramSettings.is_deleted == False
    ).first()
    if not settings:
        settings = ReferralProgramSettings(reward_type="percentage", reward_value=10, is_active=True)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ── GET /super-admin/referral/settings ─────────────────────────────────────────

@router.get("/referral/settings")
def get_referral_settings(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    return _settings_dict(_get_or_create_settings(db))


# ── PUT /super-admin/referral/settings ─────────────────────────────────────────

@router.put("/referral/settings")
def update_referral_settings(
    body: ReferralSettingsRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    settings = _get_or_create_settings(db)
    for field, value in body.model_dump().items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return _settings_dict(settings)


# ── GET /super-admin/referral/referrals ────────────────────────────────────────

@router.get("/referral/referrals")
def list_referrals(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    referrals = (
        db.query(PharmacyReferral)
        .filter(PharmacyReferral.is_deleted == False)
        .order_by(PharmacyReferral.created_at.desc())
        .all()
    )
    pharmacy_ids = {r.referrer_pharmacy_id for r in referrals} | {
        r.referred_pharmacy_id for r in referrals if r.referred_pharmacy_id
    }
    pharmacies = {
        p.id: p.name
        for p in db.query(Pharmacy).filter(Pharmacy.id.in_(pharmacy_ids)).all()
    } if pharmacy_ids else {}

    return [
        {
            "id": r.id,
            "referrer_pharmacy_id": r.referrer_pharmacy_id,
            "referrer_pharmacy_name": pharmacies.get(r.referrer_pharmacy_id, "Unknown"),
            "referred_pharmacy_id": r.referred_pharmacy_id,
            "referred_pharmacy_name": pharmacies.get(r.referred_pharmacy_id) if r.referred_pharmacy_id else None,
            "referral_code": r.referral_code,
            "status": r.status,
            "reward_amount": float(r.reward_amount) if r.reward_amount is not None else None,
            "rewarded_at": r.rewarded_at.isoformat() if r.rewarded_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in referrals
    ]


# ── POST /super-admin/referral/referrals/:id/mark-rewarded ────────────────────

@router.post("/referral/referrals/{referral_id}/mark-rewarded")
def mark_referral_rewarded(
    referral_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    referral = db.query(PharmacyReferral).filter(
        PharmacyReferral.id == referral_id, PharmacyReferral.is_deleted == False
    ).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    if referral.status != "converted":
        raise HTTPException(status_code=400, detail="Only converted referrals can be marked as rewarded")

    settings = _get_or_create_settings(db)
    referral.status = "rewarded"
    referral.rewarded_at = datetime.utcnow()
    if referral.reward_amount is None:
        referral.reward_amount = float(settings.reward_value or 0)
    db.commit()
    db.refresh(referral)
    return {"message": "Referral marked as rewarded", "id": referral.id}
