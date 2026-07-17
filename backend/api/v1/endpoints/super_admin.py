"""
api/v1/endpoints/super_admin.py
────────────────────────────────
Platform-level Super Admin API.
All routes require the caller to be in the super_admins table.
Regular pharmacy staff cannot access any of these endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.config import settings
from database import SessionLocal
from models.users import Pharmacy, SuperAdmin, Branch, User

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


# ── DB session ────────────────────────────────────────────────────────────────

def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Super-admin gate ──────────────────────────────────────────────────────────

def require_super_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(_get_db),
) -> str:
    """
    Dependency: resolves the calling user and verifies they are a super_admin.
    Returns the user_id string.
    Raises 401/403 otherwise.
    """
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub", "")
        is_sa_claim: bool = bool(payload.get("is_super_admin", False))
    except JWTError:
        raise creds_exc

    if not user_id:
        raise creds_exc

    # JWT claim is a fast-path hint; always double-check the DB
    if is_sa_claim:
        sa = db.query(SuperAdmin).filter(
            SuperAdmin.auth_user_id == user_id,
            SuperAdmin.is_active == True,
        ).first()
        if sa:
            return user_id

    # Fallback: check DB even when claim is absent (handles freshly-added admins)
    sa = db.query(SuperAdmin).filter(
        SuperAdmin.auth_user_id == user_id,
        SuperAdmin.is_active == True,
    ).first()
    if not sa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required.",
        )
    return user_id


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PharmacyCreateRequest(BaseModel):
    name: str
    owner_contact: Optional[str] = None
    subscription_status: str = "trial"
    admin_username: str
    admin_password: str

    @field_validator("subscription_status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"active", "suspended", "trial"}
        if v not in allowed:
            raise ValueError(f"subscription_status must be one of {allowed}")
        return v


class PharmacyPatchRequest(BaseModel):
    subscription_status: str

    @field_validator("subscription_status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"active", "suspended", "trial"}
        if v not in allowed:
            raise ValueError(f"subscription_status must be one of {allowed}")
        return v


# ── Helper: build stats for one pharmacy ──────────────────────────────────────

def _pharmacy_stats(pharmacy: Pharmacy, db: Session) -> dict:
    staff_count = db.query(func.count(User.id)).filter(
        User.pharmacy_id == pharmacy.id,
        User.is_deleted == False,
    ).scalar() or 0

    branch_count = db.query(func.count(Branch.id)).filter(
        Branch.pharmacy_id == pharmacy.id,
        Branch.is_deleted == False,
    ).scalar() or 0

    return {
        "id": pharmacy.id,
        "name": pharmacy.name,
        "owner_contact": pharmacy.owner_contact,
        "subscription_status": pharmacy.subscription_status,
        "is_active": pharmacy.is_active,
        "created_at": pharmacy.created_at.isoformat() if pharmacy.created_at else None,
        "staff_count": staff_count,
        "branch_count": branch_count,
    }


# ── GET /super-admin/pharmacies ───────────────────────────────────────────────

@router.get("/pharmacies")
def list_pharmacies(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """List all pharmacies with basic stats."""
    pharmacies = (
        db.query(Pharmacy)
        .filter(Pharmacy.is_deleted == False)
        .order_by(Pharmacy.created_at.desc())
        .all()
    )
    return [_pharmacy_stats(p, db) for p in pharmacies]


# ── POST /super-admin/pharmacies ──────────────────────────────────────────────

@router.post("/pharmacies", status_code=status.HTTP_201_CREATED)
def create_pharmacy(
    body: PharmacyCreateRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """
    Create a new pharmacy.
    Creates the Pharmacy row. Optionally creates an initial branch.
    """
    from models.users import Tenant, User, UserBranch, Role
    from core.security import get_password_hash

    # 1. Create legacy Tenant for backward compatibility
    tenant_id = str(uuid.uuid4())
    tenant = Tenant(
        id=tenant_id,
        name=body.name,
        subdomain=f"pharmacy-{tenant_id[:8]}",
        is_active=True
    )
    db.add(tenant)
    db.flush()

    # Automatically seed the Chart of Accounts for this tenant
    from services.accounts_service import AccountsService
    AccountsService(db).seed_default_chart(tenant.id)

    # 2. Create Pharmacy
    pharmacy = Pharmacy(
        id=str(uuid.uuid4()),
        name=body.name,
        owner_contact=body.owner_contact,
        subscription_status=body.subscription_status,
        is_active=True,
        tenant_id=tenant.id,
        created_at=datetime.utcnow(),
    )
    db.add(pharmacy)
    db.flush()

    # 3. Create Main Branch
    branch = Branch(
        id=str(uuid.uuid4()),
        name="Main Branch",
        code=f"BR-{pharmacy.id[:6].upper()}",
        is_main=True,
        pharmacy_id=pharmacy.id,
        tenant_id=tenant.id,
    )
    db.add(branch)
    db.flush()

    # 4. Create Admin User
    role = db.query(Role).filter(Role.name == "Pharmacy Owner").first()
    if not role:
        role = Role(
            id=str(uuid.uuid4()),
            name="Pharmacy Owner",
            description="Owner of the Pharmacy",
            is_system_default=True
        )
        db.add(role)
        db.flush()
    user = User(
        id=str(uuid.uuid4()),
        username=body.admin_username,
        email=f"{body.admin_username}@pharmacy.local",
        hashed_password=get_password_hash(body.admin_password),
        full_name="Pharmacy Admin",
        is_active=True,
        role_id=role.id if role else None,
        tenant_id=tenant.id,
        pharmacy_id=pharmacy.id,
    )
    db.add(user)
    db.flush()

    # Link user to branch
    ub = UserBranch(user_id=user.id, branch_id=branch.id)
    db.add(ub)

    db.commit()
    db.refresh(pharmacy)

    return _pharmacy_stats(pharmacy, db)


# ── GET /super-admin/pharmacies/:id ──────────────────────────────────────────

@router.get("/pharmacies/{pharmacy_id}")
def get_pharmacy_detail(
    pharmacy_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """Full stats for one pharmacy."""
    pharmacy = db.query(Pharmacy).filter(
        Pharmacy.id == pharmacy_id,
        Pharmacy.is_deleted == False,
    ).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")

    stats = _pharmacy_stats(pharmacy, db)

    # Add extended details
    branches = db.query(Branch).filter(
        Branch.pharmacy_id == pharmacy_id,
        Branch.is_deleted == False,
    ).all()
    stats["branches"] = [
        {"id": b.id, "name": b.name, "code": b.code, "is_main": b.is_main}
        for b in branches
    ]

    users = db.query(User).filter(
        User.pharmacy_id == pharmacy_id,
        User.is_deleted == False,
    ).all()
    stats["users"] = [
        {"id": u.id, "username": u.username, "full_name": u.full_name, "email": u.email, "is_active": u.is_active}
        for u in users
    ]

    return stats


class BranchCreateRequest(BaseModel):
    name: str
    code: str
    is_main: bool = False

@router.post("/pharmacies/{pharmacy_id}/branches", status_code=status.HTTP_201_CREATED)
def create_branch_for_pharmacy(
    pharmacy_id: str,
    body: BranchCreateRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """Create a new branch for a specific pharmacy."""
    pharmacy = db.query(Pharmacy).filter(
        Pharmacy.id == pharmacy_id,
        Pharmacy.is_deleted == False,
    ).first()
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
        
    branch = Branch(
        id=str(uuid.uuid4()),
        name=body.name,
        code=body.code,
        is_main=body.is_main,
        pharmacy_id=pharmacy.id,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    
    return {"id": branch.id, "name": branch.name, "code": branch.code, "is_main": branch.is_main}

# ── PATCH /super-admin/pharmacies/:id ────────────────────────────────────────

@router.patch("/pharmacies/{pharmacy_id}")
def update_pharmacy_status(
    pharmacy_id: str,
    body: PharmacyPatchRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """Update a pharmacy's subscription_status (active / suspended / trial)."""
    pharmacy = db.query(Pharmacy).filter(
        Pharmacy.id == pharmacy_id,
        Pharmacy.is_deleted == False,
    ).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")

    old_status = pharmacy.subscription_status
    pharmacy.subscription_status = body.subscription_status
    pharmacy.is_active = (body.subscription_status != "suspended")
    db.commit()
    db.refresh(pharmacy)

    return {
        **_pharmacy_stats(pharmacy, db),
        "previous_status": old_status,
    }

# ── Billing APIs ──────────────────────────────────────────────────────────────

from models.billing import PharmacySubscription, PaymentTransaction, SubscriptionPlan
from services.billing_service import BillingService

class ManualPaymentRequest(BaseModel):
    amount: float
    reference_note: str

@router.get("/pharmacies/{pharmacy_id}/billing")
def get_pharmacy_billing(
    pharmacy_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """Get subscription details and payment history for a pharmacy."""
    subscription = db.query(PharmacySubscription).filter_by(pharmacy_id=pharmacy_id).first()
    
    if not subscription:
        return {"subscription": None, "transactions": []}
        
    plan = db.query(SubscriptionPlan).filter_by(id=subscription.plan_id).first()
    
    transactions = db.query(PaymentTransaction).filter_by(subscription_id=subscription.id).order_by(PaymentTransaction.created_at.desc()).all()
    
    return {
        "subscription": {
            "status": subscription.status,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "plan_name": plan.name if plan else "Unknown Plan",
            "billing_cycle": plan.billing_cycle if plan else "monthly"
        },
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "currency": t.currency,
                "gateway": t.gateway,
                "status": t.status,
                "created_at": t.created_at
            }
            for t in transactions
        ]
    }

@router.post("/pharmacies/{pharmacy_id}/manual-payment")
def record_manual_payment(
    pharmacy_id: str,
    request: ManualPaymentRequest,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    """Admin-only endpoint to log offline cash/bank transfers."""
    try:
        txn = BillingService.record_manual_payment(
            db=db,
            pharmacy_id=pharmacy_id,
            amount=request.amount,
            reference_note=request.reference_note
        )
        return {"msg": "Payment recorded successfully", "transaction_id": txn.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
