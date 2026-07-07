"""
Backend Module Guard: FastAPI dependency that checks if a module is enabled
before allowing access to any endpoint.

Usage in a router:
    from dependencies.module_guard import require_module
    
    @router.get("/customers")
    def get_customers(
        _: None = Depends(require_module("customers")),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        ...
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.settings import SystemModule
from core.deps import get_current_user
from models.users import User


def require_module(module_key: str):
    """
    Returns a FastAPI dependency that validates the named module is enabled
    for the current user's tenant.
    Super Admin users always pass regardless of module state.
    """
    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        # Super Admin and Owner always have access
        if current_user.is_super_admin or (current_user.role and ("super" in current_user.role.name.lower() or "owner" in current_user.role.name.lower())):
            return current_user

        mod = (
            db.query(SystemModule)
            .filter(
                SystemModule.tenant_id == current_user.tenant_id,
                SystemModule.module_key == module_key,
            )
            .first()
        )

        # If the module row doesn't exist yet it means it was never seeded
        # (e.g. fresh install before first visit to /settings/modules).
        # We default to ALLOW in this case so existing routes keep working.
        if mod is None:
            return current_user

        if not mod.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Module '{module_key}' is currently disabled by your administrator.",
            )

        return current_user

    return _check
