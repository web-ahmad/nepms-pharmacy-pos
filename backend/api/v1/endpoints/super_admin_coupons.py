"""
api/v1/endpoints/super_admin_coupons.py
─────────────────────────────────────────
Platform-level Coupon CRUD (e.g. subscription discount codes). Super-admin only.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from api.v1.endpoints.super_admin import require_super_admin, _get_db
from models.platform import PlatformCoupon

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CouponRequest(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float
    max_redemptions: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True

    @field_validator("discount_type")
    @classmethod
    def validate_type(cls, v):
        allowed = {"percentage", "fixed"}
        if v not in allowed:
            raise ValueError(f"discount_type must be one of {allowed}")
        return v

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v):
        return v.strip().upper()


class CouponPatchRequest(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_redemptions: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None

    @field_validator("discount_type")
    @classmethod
    def validate_type(cls, v):
        if v is None:
            return v
        allowed = {"percentage", "fixed"}
        if v not in allowed:
            raise ValueError(f"discount_type must be one of {allowed}")
        return v

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v):
        return v.strip().upper() if v else v


def _coupon_dict(c: PlatformCoupon) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "description": c.description,
        "discount_type": c.discount_type,
        "discount_value": float(c.discount_value) if c.discount_value is not None else 0,
        "max_redemptions": c.max_redemptions,
        "times_redeemed": c.times_redeemed,
        "valid_from": c.valid_from.isoformat() if c.valid_from else None,
        "valid_until": c.valid_until.isoformat() if c.valid_until else None,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ── GET /super-admin/coupons ───────────────────────────────────────────────────

@router.get("/coupons")
def list_coupons(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    coupons = (
        db.query(PlatformCoupon)
        .filter(PlatformCoupon.is_deleted == False)
        .order_by(PlatformCoupon.created_at.desc())
        .all()
    )
    return [_coupon_dict(c) for c in coupons]


# ── POST /super-admin/coupons ──────────────────────────────────────────────────

@router.post("/coupons", status_code=status.HTTP_201_CREATED)
def create_coupon(
    body: CouponRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    existing = db.query(PlatformCoupon).filter(
        PlatformCoupon.code == body.code, PlatformCoupon.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A coupon with this code already exists")

    coupon = PlatformCoupon(**body.model_dump())
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return _coupon_dict(coupon)


# ── PATCH /super-admin/coupons/:id ─────────────────────────────────────────────

@router.patch("/coupons/{coupon_id}")
def update_coupon(
    coupon_id: str,
    body: CouponPatchRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    coupon = db.query(PlatformCoupon).filter(
        PlatformCoupon.id == coupon_id, PlatformCoupon.is_deleted == False
    ).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    data = body.model_dump(exclude_unset=True)
    if "code" in data and data["code"] != coupon.code:
        clash = db.query(PlatformCoupon).filter(
            PlatformCoupon.code == data["code"],
            PlatformCoupon.id != coupon_id,
            PlatformCoupon.is_deleted == False,
        ).first()
        if clash:
            raise HTTPException(status_code=400, detail="A coupon with this code already exists")

    for field, value in data.items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return _coupon_dict(coupon)


# ── DELETE /super-admin/coupons/:id ────────────────────────────────────────────

@router.delete("/coupons/{coupon_id}")
def delete_coupon(
    coupon_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    coupon = db.query(PlatformCoupon).filter(
        PlatformCoupon.id == coupon_id, PlatformCoupon.is_deleted == False
    ).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    coupon.is_deleted = True
    coupon.is_active = False
    db.commit()
    return {"message": "Coupon deleted successfully"}
