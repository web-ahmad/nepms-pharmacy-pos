"""
core/deps.py
────────────
Central FastAPI dependency hub.

Key rule: NEVER check role names. Always use:
  • hierarchy_level  (from JWT)  for structural access control
  • requires_permission("module:action")  for fine-grained access
"""

from typing import Generator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import SessionLocal
from core.config import settings
from models.users import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


# ── DB session ───────────────────────────────────────────────────────────────

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


# ── Audit context (unchanged) ────────────────────────────────────────────────

from core.audit_context import set_audit_context, current_user_id, current_tenant_id, current_branch_id


# ── Current user ─────────────────────────────────────────────────────────────

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if user is None or not user.is_active:
        raise credentials_exception

    # Inject hierarchy_level from JWT so model properties can use it
    user._jwt_hierarchy_level    = payload.get("hierarchy_level", 4)
    user._jwt_role_id            = payload.get("role_id", "")
    user._jwt_permissions        = payload.get("permissions", [])
    user._jwt_is_super_admin     = payload.get("is_super_admin", False)
    user._jwt_branch_scope       = payload.get("branch_scope", "assigned_branch")
    user._jwt_data_scope         = payload.get("data_scope", "branch")
    user._jwt_permissions_version = payload.get("permissions_version", "")

    current_user_id.set(user.id)
    return user


# ── Tenant context ───────────────────────────────────────────────────────────

class TenantContext:
    def __init__(self, tenant_id: str, branch_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.branch_id = branch_id


def get_tenant_context(token: str = Depends(oauth2_scheme)) -> TenantContext:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        tenant_id: str = payload.get("tenant_id")
        branch_id: str = payload.get("branch_id")
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context missing in token")

        current_tenant_id.set(tenant_id)
        current_branch_id.set(branch_id)

        return TenantContext(tenant_id=tenant_id, branch_id=branch_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Permission Guard — THE single permission check ────────────────────────────
#
# Usage examples:
#   @router.get("/sales", dependencies=[Depends(requires_permission("sales:view"))])
#   def get_sales(...):  ...
#
#   @router.post("/sales", dependencies=[Depends(requires_permission("sales:create"))])
#   def create_sale(...):  ...

class requires_permission:
    """
    FastAPI dependency that checks a single permission code against the JWT.

    Access is granted if ANY of the following is true:
      1. is_super_admin is True in the JWT (Level 1 — SaaS only)
      2. "*" is in the permissions list (Level 2 — Pharmacy Owner)
      3. The specific permission code is present in the permissions list

    NEVER checks role names. Uses JWT claims only.
    """
    def __init__(self, permission_code: str):
        self.permission_code = permission_code

    def __call__(self, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> dict:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise credentials_exception

        is_sa:           bool = bool(payload.get("is_super_admin", False))
        hierarchy_level: int  = payload.get("hierarchy_level", 4)
        permissions:     list = payload.get("permissions", [])

        # L1 Super Admin: pass only system:* permissions
        if is_sa:
            if self.permission_code.startswith("system:") or self.permission_code == "*":
                return payload
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin cannot access pharmacy business data.",
            )

        # L2 Pharmacy Owner with wildcard
        if "*" in permissions:
            return payload

        # For L3 and L4 (granual permissions), the token's 'permissions' array might be empty or truncated
        # to avoid 431 Request Header Too Large errors. We must fetch the actual permissions from DB.
        if hierarchy_level >= 3:
            from models.enterprise.user import EnterpriseUser
            from services.enterprise.user_service import user_service
            user_id = payload.get("sub")
            branch_id = payload.get("branch_id")
            eu = db.query(EnterpriseUser).filter(EnterpriseUser.user_id == user_id, EnterpriseUser.is_deleted == False).first()
            if not eu:
                raise credentials_exception
            
            # Fetch and overwrite permissions
            permissions = user_service.compute_effective_permissions(db, enterprise_user=eu, branch_id=branch_id)

        # Explicit permission check
        if self.permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {self.permission_code}",
            )
        return payload


# ── Hierarchy Guard — for structural access (e.g. branch creation) ────────────
#
# Usage:
#   @router.post("/branches", dependencies=[Depends(requires_hierarchy(max_level=2))])

class requires_hierarchy:
    """
    Restricts an endpoint to users with hierarchy_level <= max_level.

    Example: branches:create should only be available to L2 (Pharmacy Owner).
        requires_hierarchy(max_level=2)
    """
    def __init__(self, max_level: int):
        self.max_level = max_level

    def __call__(self, token: str = Depends(oauth2_scheme)) -> dict:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise HTTPException(status_code=401, detail="Could not validate credentials")

        hierarchy_level: int = payload.get("hierarchy_level", 4)
        is_sa:           bool = bool(payload.get("is_super_admin", False))

        if is_sa:
            # Super Admin (L1) can never access pharmacy business endpoints
            if self.max_level < 1:
                return payload
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin cannot access pharmacy business data.",
            )

        if hierarchy_level > self.max_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires hierarchy level ≤ {self.max_level}. Your level: {hierarchy_level}.",
            )
        return payload


# ── Token payload helper ─────────────────────────────────────────────────────

def get_token_payload(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── DEPRECATED: RequirePermissions ───────────────────────────────────────────
# Kept as a no-op shim for backward compatibility during migration.
# All callers must be migrated to requires_permission("module:action").
# This class will be REMOVED in Phase 7.

class RequirePermissions:
    """
    DEPRECATED — use requires_permission("module:action") instead.
    This shim always passes to avoid breaking existing routes during migration.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        # Shim: passes everything — the real guard is requires_permission()
        # TODO: Replace each caller with requires_permission("module:action")
        return current_user
