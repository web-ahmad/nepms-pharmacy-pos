"""
dependencies/auth.py
─────────────────────
DEPRECATED helper. Kept for backward compatibility only.

Previously used role-name checks ("super" in role.name.lower()).
Now passes all requests — callers must migrate to requires_permission().
"""

from fastapi import Depends
from core.deps import get_current_user
from models.users import User


def require_role(required_role: str):
    """
    DEPRECATED — use requires_permission("module:action") instead.

    This shim always passes to avoid breaking existing routes.
    Every caller should be migrated to the permission-based system.
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        # Shim: always allow. Real enforcement happens via requires_permission().
        return current_user

    return role_checker
