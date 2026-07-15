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
from fastapi import Depends, HTTPException, status
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
    is_super_admin  : bool         — True if caller bypasses all pharmacy filters
    tenant_id       : str          — legacy tenant_id (backward compat)
    """

    def __init__(
        self,
        pharmacy_id: Optional[str],
        is_super_admin: bool,
        tenant_id: str,
        branch_id: Optional[str] = None,
    ):
        self.pharmacy_id    = pharmacy_id
        self.is_super_admin = is_super_admin
        self.tenant_id      = tenant_id
        self.branch_id      = branch_id

    # ── read filter ──────────────────────────────────────────────────────────

    def apply(self, query, model):
        """
        Narrow a SQLAlchemy query to the caller's pharmacy.
        Super-admins get an unfiltered query.

        Usage:
            q = scope.apply(db.query(Sale), Sale)
        """
        if self.is_super_admin:
            return query  # sees everything

        # Prefer pharmacy_id (new column), fall back to tenant_id
        if hasattr(model, "pharmacy_id") and self.pharmacy_id:
            return query.filter(model.pharmacy_id == self.pharmacy_id)
        if hasattr(model, "tenant_id") and self.tenant_id:
            return query.filter(model.tenant_id == self.tenant_id)
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


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_pharmacy_scope(
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
        user_id:     str  = payload.get("sub", "")
        tenant_id:   str  = payload.get("tenant_id", "")
        pharmacy_id: str  = payload.get("pharmacy_id", "")
        branch_id:   str  = payload.get("branch_id", "")
        is_sa_claim: bool = bool(payload.get("is_super_admin", False))
    except JWTError:
        raise creds_exc

    if not user_id:
        raise creds_exc

    # Super-admin path: JWT claim + DB double-check
    if is_sa_claim or _db_is_super_admin(db, user_id):
        return PharmacyScope(pharmacy_id=None, is_super_admin=True, tenant_id=tenant_id, branch_id=branch_id or None)

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
        pharmacy_id=pharmacy_id or None,
        is_super_admin=False,
        tenant_id=tenant_id,
        branch_id=branch_id or None,
    )


# ── Optional dependency variant (no 401 on missing token) ────────────────────

def get_pharmacy_scope_optional(
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
        return get_pharmacy_scope.__wrapped__(token, db)
    except HTTPException:
        return None
