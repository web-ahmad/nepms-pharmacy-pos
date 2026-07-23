"""
api/v1/endpoints/super_admin_plans.py
──────────────────────────────────────
Platform-level Subscription Plan CRUD. Super-admin only.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.v1.endpoints.super_admin import require_super_admin, _get_db
from models.billing import SubscriptionPlan, PharmacySubscription

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    name: str
    price: float
    billing_cycle: str = "monthly"
    features_limits: Optional[dict] = None
    is_active: bool = True

    @field_validator("billing_cycle")
    @classmethod
    def validate_cycle(cls, v):
        allowed = {"monthly", "yearly"}
        if v not in allowed:
            raise ValueError(f"billing_cycle must be one of {allowed}")
        return v


class PlanPatchRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    features_limits: Optional[dict] = None
    is_active: Optional[bool] = None

    @field_validator("billing_cycle")
    @classmethod
    def validate_cycle(cls, v):
        if v is None:
            return v
        allowed = {"monthly", "yearly"}
        if v not in allowed:
            raise ValueError(f"billing_cycle must be one of {allowed}")
        return v


def _plan_dict(plan: SubscriptionPlan, active_count: int) -> dict:
    return {
        "id": plan.id,
        "name": plan.name,
        "price": float(plan.price) if plan.price is not None else 0,
        "billing_cycle": plan.billing_cycle,
        "features_limits": plan.features_limits or {},
        "is_active": plan.is_active,
        "active_pharmacy_count": active_count,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }


# ── GET /super-admin/plans ─────────────────────────────────────────────────────

@router.get("/plans")
def list_plans(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    plans = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.is_deleted == False)
        .order_by(SubscriptionPlan.created_at.desc())
        .all()
    )
    counts = dict(
        db.query(PharmacySubscription.plan_id, func.count(PharmacySubscription.id))
        .filter(PharmacySubscription.status == "active")
        .group_by(PharmacySubscription.plan_id)
        .all()
    )
    return [_plan_dict(p, counts.get(p.id, 0)) for p in plans]


# ── POST /super-admin/plans ────────────────────────────────────────────────────

@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(
    body: PlanRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    plan = SubscriptionPlan(
        name=body.name,
        price=body.price,
        billing_cycle=body.billing_cycle,
        features_limits=body.features_limits or {},
        is_active=body.is_active,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan, 0)


# ── PATCH /super-admin/plans/:id ───────────────────────────────────────────────

@router.patch("/plans/{plan_id}")
def update_plan(
    plan_id: str,
    body: PlanPatchRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == plan_id, SubscriptionPlan.is_deleted == False
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)

    active_count = db.query(func.count(PharmacySubscription.id)).filter(
        PharmacySubscription.plan_id == plan.id,
        PharmacySubscription.status == "active",
    ).scalar() or 0
    return _plan_dict(plan, active_count)


# ── DELETE /super-admin/plans/:id ──────────────────────────────────────────────

@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.id == plan_id, SubscriptionPlan.is_deleted == False
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    active_count = db.query(func.count(PharmacySubscription.id)).filter(
        PharmacySubscription.plan_id == plan.id,
        PharmacySubscription.status == "active",
    ).scalar() or 0
    if active_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete plan: {active_count} pharmacy(ies) are actively subscribed to it.",
        )

    plan.is_deleted = True
    plan.is_active = False
    db.commit()
    return {"message": "Plan deleted successfully"}
