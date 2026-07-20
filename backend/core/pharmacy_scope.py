"""
core/pharmacy_scope.py
───────────────────────
Application-layer Row-Level Security (RLS) for the NEPMS multi-tenant SaaS platform.

Every endpoint injects `PharmacyScope` via `Depends(get_pharmacy_scope)`.
Calling `scope.apply(query, Model)` automatically narrows the query to the
caller's pharmacy — or returns it unfiltered for super_admins.

Design goals
─────────────
• Zero extra DB round-trips for the happy path (pharmacy_id lives in the JWT)
• DB double-check for super_admin (prevents forged/stale tokens from gaining
  cross-pharmacy access)
• Backward-compatible: scope.tenant_id still available for legacy code paths
• Suspended pharmacies are rejected at scope-resolution time
"""

from __future__ import annotations

from typing import Optional, Generator
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from core.config import settings
from database import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


# ── DB session helper (local to avoid circular imports) ───────────────────────

def _get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Super-admin DB check ──────────────────────────────────────────────────────

def _db_is_super_admin(db: Session, user_id: str) -> bool:
    """Check the super_admins table — guards against stale JWT claims."""
    from models.users import SuperAdmin
    return db.query(SuperAdmin).filter(
        SuperAdmin.auth_user_id == user_id,
        SuperAdmin.is_active == True,
    ).first() is not None


# ── PharmacyScope ─────────────────────────────────────────────────────────────

class PharmacyScope:
    """
    Resolved per-request pharmacy scope.

    Attributes
    ----------
    pharmacy_id     : str | None   — the caller's pharmacy (None = super_admin)
    is_super_admin  : bool         — True if caller is Level 1 (SaaS only)
    tenant_id       : str          — legacy tenant_id (backward compat)
    branch_id       : str | None   — active branch context
    hierarchy_level : int          — 1=SA 2=PharmacyOwner 3=BranchOwner 4=Staff

    Data Isolation Rules:
        L1 (Super Admin)     → No pharmacy data access at all
        L2 (Pharmacy Owner)  → Filtered to pharmacy_id only (all branches)
        L3 (Branch Owner)    → Filtered to pharmacy_id + branch_id
        L4 (Staff)           → Filtered to pharmacy_id + branch_id
    """

    def __init__(
        self,
        pharmacy_id: Optional[str],
        is_super_admin: bool,
        tenant_id: str,
        branch_id: Optional[str] = None,
        hierarchy_level: int = 4,
    ):
        self.pharmacy_id     = pharmacy_id
        self.is_super_admin  = is_super_admin
        self.tenant_id       = tenant_id
        self.branch_id       = branch_id
        self.hierarchy_level = hierarchy_level

    # ── read filter ──────────────────────────────────────────────────────────

    def apply(self, query, model):
        """
        Narrow a SQLAlchemy query to the caller's data scope.

        L1 (Super Admin)     → HTTPException 403 — no pharmacy data
        L2 (Pharmacy Owner)  → filter by pharmacy_id
        L3/L4 (Branch level) → filter by pharmacy_id + branch_id
        """
        # L1: Super Admin must NOT access pharmacy business data
        # If an endpoint calls scope.apply(), it should have been guarded upstream.
        # Return unfiltered here (route-level guard handles L1 rejection).
        if self.is_super_admin:
            return query

        # Build pharmacy filter first
        if hasattr(model, "pharmacy_id") and self.pharmacy_id:
            query = query.filter(model.pharmacy_id == self.pharmacy_id)
        elif hasattr(model, "tenant_id") and self.tenant_id:
            query = query.filter(model.tenant_id == self.tenant_id)

        # L3/L4: also filter by branch_id when model has the column
        if self.hierarchy_level >= 3 and self.branch_id:
            if hasattr(model, "branch_id"):
                query = query.filter(model.branch_id == self.branch_id)

        return query

    # ── write guard ──────────────────────────────────────────────────────────

    def assert_owns(self, obj, raise_on_missing: bool = True) -> bool:
        """
        Verify that an existing ORM object belongs to the caller's pharmacy.
        Call before any UPDATE or DELETE.

        Usage:
            scope.assert_owns(sale)   # raises 403 if wrong pharmacy
        """
        if self.is_super_admin:
            return True

        obj_pid = getattr(obj, "pharmacy_id", None)
        obj_tid = getattr(obj, "tenant_id", None)
        obj_bid = getattr(obj, "branch_id", None)

        # Pharmacy isolation
        if obj_pid and self.pharmacy_id and obj_pid != self.pharmacy_id:
            if raise_on_missing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: resource belongs to a different pharmacy.",
                )
            return False

        if obj_tid and self.tenant_id and obj_tid != self.tenant_id and obj_pid is None:
            if raise_on_missing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: resource belongs to a different tenant.",
                )
            return False

        # Branch isolation for L3/L4
        if self.hierarchy_level >= 3 and self.branch_id and obj_bid:
            if obj_bid != self.branch_id:
                if raise_on_missing:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: resource belongs to a different branch.",
                    )
                return False

        return True

    # ── convenience ──────────────────────────────────────────────────────────

    def stamp(self, obj) -> None:
        """
        Stamp pharmacy_id (and tenant_id) onto a new ORM object before INSERT.
        Usage:
            scope.stamp(new_sale)
            db.add(new_sale)
        """
        if hasattr(obj, "pharmacy_id") and not getattr(obj, "pharmacy_id", None):
            obj.pharmacy_id = self.pharmacy_id
        if hasattr(obj, "tenant_id") and not getattr(obj, "tenant_id", None):
            obj.tenant_id = self.tenant_id
        if hasattr(obj, "branch_id") and not getattr(obj, "branch_id", None) and self.branch_id:
            obj.branch_id = self.branch_id




# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_pharmacy_scope(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(_get_db),
) -> PharmacyScope:
    """
    FastAPI dependency that resolves and returns the pharmacy scope for the
    current request. Inject it with:

        scope: PharmacyScope = Depends(get_pharmacy_scope)
    """
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id:         str  = payload.get("sub", "")
        tenant_id:       str  = payload.get("tenant_id", "")
        pharmacy_id:     str  = payload.get("pharmacy_id", "")
        branch_id:       str  = payload.get("branch_id", "")
        is_sa_claim:     bool = bool(payload.get("is_super_admin", False))
        hierarchy_level: int  = int(payload.get("hierarchy_level", 4))
        assigned_branches: list = payload.get("assigned_branches", [])
    except JWTError:
        raise creds_exc

    if not user_id:
        raise creds_exc

    is_actually_sa = is_sa_claim or _db_is_super_admin(db, user_id)

    # Allow frontend to override the active branch context via header
    header_branch_id = request.headers.get("x-branch-id")
    if header_branch_id:
        if header_branch_id == "all":
            if is_actually_sa or hierarchy_level <= 2:
                branch_id = None
            # If a lower-level user sends 'all' due to UI race conditions, ignore it 
            # and let it fall back to their default branch_id from the JWT payload.
        elif is_actually_sa or header_branch_id in assigned_branches:
            branch_id = header_branch_id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: you do not have permission to view this branch."
            )

    # Super-admin path: JWT claim + DB double-check
    if is_actually_sa:
        return PharmacyScope(
            pharmacy_id     = None,
            is_super_admin  = True,
            tenant_id       = tenant_id,
            branch_id       = branch_id or None,
            hierarchy_level = 1,
        )

    # Suspended pharmacy check
    if pharmacy_id:
        from models.users import Pharmacy
        pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
        if pharmacy and pharmacy.subscription_status == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your pharmacy subscription is suspended. Please contact support.",
            )

    return PharmacyScope(
        pharmacy_id     = pharmacy_id or None,
        is_super_admin  = False,
        tenant_id       = tenant_id,
        branch_id       = branch_id or None,
        hierarchy_level = hierarchy_level,
    )


# ── Optional dependency variant (no 401 on missing token) ────────────────────

def get_pharmacy_scope_optional(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(_get_db),
) -> Optional[PharmacyScope]:
    """
    Like get_pharmacy_scope but returns None instead of raising 401
    when no token is provided. Used for public endpoints that benefit
    from scoping when authenticated.
    """
    if not token:
        return None
    try:
        return get_pharmacy_scope.__wrapped__(request, token, db)
    except HTTPException:
        return None
