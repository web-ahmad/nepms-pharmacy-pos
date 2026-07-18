"""
dependencies/module_guard.py
─────────────────────────────
FastAPI dependency that checks if a module is enabled before allowing access.

Rule: NEVER check role names. Use hierarchy_level from JWT instead.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from database import get_db
from models.settings import SystemModule
from core.config import settings

oauth2_scheme_local = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def require_module(module_key: str):
    """
    Returns a FastAPI dependency that validates the named module is enabled
    for the current user's tenant.

    Access Rules:
    - Level 1 (Super Admin): always passes — for SaaS monitoring purposes
    - Level 2 (Pharmacy Owner): always passes — owns the tenant
    - Level 3/4: check SystemModule.is_enabled for their tenant
    """
    def _check(
        token: str = Depends(oauth2_scheme_local),
        db: Session = Depends(get_db),
    ) -> dict:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

        is_sa:           bool = bool(payload.get("is_super_admin", False))
        hierarchy_level: int  = int(payload.get("hierarchy_level", 4))
        tenant_id:       str  = payload.get("tenant_id", "")

        # L1 Super Admin and L2 Pharmacy Owner always pass module checks
        # They control the modules — they cannot be blocked by module flags
        if is_sa or hierarchy_level <= 2:
            return payload

        # L3/L4: check if the module is enabled for this tenant
        mod = (
            db.query(SystemModule)
            .filter(
                SystemModule.tenant_id == tenant_id,
                SystemModule.module_key == module_key,
            )
            .first()
        )

        # If no module row exists yet (fresh install), default to ALLOW
        if mod is None:
            return payload

        if not mod.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Module '{module_key}' is currently disabled by your administrator.",
            )

        return payload

    return _check
