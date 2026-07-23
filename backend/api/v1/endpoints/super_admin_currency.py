"""
api/v1/endpoints/super_admin_currency.py
──────────────────────────────────────────
Platform-level Currency CRUD. Super-admin only.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from api.v1.endpoints.super_admin import require_super_admin, _get_db
from models.platform import PlatformCurrency

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CurrencyRequest(BaseModel):
    code: str
    name: str
    symbol: str
    exchange_rate: float = 1
    is_base: bool = False
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v):
        v = v.strip().upper()
        if len(v) != 3:
            raise ValueError("code must be a 3-letter ISO currency code")
        return v


class CurrencyPatchRequest(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    symbol: Optional[str] = None
    exchange_rate: Optional[float] = None
    is_active: Optional[bool] = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v):
        if v is None:
            return v
        v = v.strip().upper()
        if len(v) != 3:
            raise ValueError("code must be a 3-letter ISO currency code")
        return v


def _currency_dict(c: PlatformCurrency) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "name": c.name,
        "symbol": c.symbol,
        "exchange_rate": float(c.exchange_rate) if c.exchange_rate is not None else 1,
        "is_base": c.is_base,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ── GET /super-admin/currency ──────────────────────────────────────────────────

@router.get("/currency")
def list_currencies(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    currencies = (
        db.query(PlatformCurrency)
        .filter(PlatformCurrency.is_deleted == False)
        .order_by(PlatformCurrency.is_base.desc(), PlatformCurrency.code.asc())
        .all()
    )
    return [_currency_dict(c) for c in currencies]


# ── POST /super-admin/currency ─────────────────────────────────────────────────

@router.post("/currency", status_code=status.HTTP_201_CREATED)
def create_currency(
    body: CurrencyRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    existing = db.query(PlatformCurrency).filter(
        PlatformCurrency.code == body.code, PlatformCurrency.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This currency code is already configured")

    is_first = db.query(PlatformCurrency).filter(PlatformCurrency.is_deleted == False).count() == 0
    currency = PlatformCurrency(
        code=body.code,
        name=body.name,
        symbol=body.symbol,
        exchange_rate=body.exchange_rate,
        is_active=body.is_active,
        is_base=body.is_base or is_first,  # first currency created becomes the base automatically
    )
    if currency.is_base:
        db.query(PlatformCurrency).filter(PlatformCurrency.is_deleted == False).update({"is_base": False})
        currency.exchange_rate = 1
    db.add(currency)
    db.commit()
    db.refresh(currency)
    return _currency_dict(currency)


# ── PATCH /super-admin/currency/:id ────────────────────────────────────────────

@router.patch("/currency/{currency_id}")
def update_currency(
    currency_id: str,
    body: CurrencyPatchRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    currency = db.query(PlatformCurrency).filter(
        PlatformCurrency.id == currency_id, PlatformCurrency.is_deleted == False
    ).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")

    data = body.model_dump(exclude_unset=True)
    if "code" in data and data["code"] != currency.code:
        clash = db.query(PlatformCurrency).filter(
            PlatformCurrency.code == data["code"],
            PlatformCurrency.id != currency_id,
            PlatformCurrency.is_deleted == False,
        ).first()
        if clash:
            raise HTTPException(status_code=400, detail="This currency code is already configured")

    for field, value in data.items():
        setattr(currency, field, value)
    if currency.is_base:
        currency.exchange_rate = 1
    db.commit()
    db.refresh(currency)
    return _currency_dict(currency)


# ── POST /super-admin/currency/:id/set-base ────────────────────────────────────

@router.post("/currency/{currency_id}/set-base")
def set_base_currency(
    currency_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    currency = db.query(PlatformCurrency).filter(
        PlatformCurrency.id == currency_id, PlatformCurrency.is_deleted == False
    ).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")

    db.query(PlatformCurrency).filter(PlatformCurrency.is_deleted == False).update({"is_base": False})
    currency.is_base = True
    currency.exchange_rate = 1
    db.commit()
    db.refresh(currency)
    return _currency_dict(currency)


# ── DELETE /super-admin/currency/:id ───────────────────────────────────────────

@router.delete("/currency/{currency_id}")
def delete_currency(
    currency_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    currency = db.query(PlatformCurrency).filter(
        PlatformCurrency.id == currency_id, PlatformCurrency.is_deleted == False
    ).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    if currency.is_base:
        raise HTTPException(status_code=400, detail="Cannot delete the base currency. Set another currency as base first.")

    currency.is_deleted = True
    currency.is_active = False
    db.commit()
    return {"message": "Currency deleted successfully"}
