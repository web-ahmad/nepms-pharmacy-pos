from datetime import datetime, timedelta
from typing import Any, Union, List, Optional
from jose import jwt
from passlib.context import CryptContext
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any],
    tenant_id: str,
    branch_id: str,
    role: str,
    permissions: List[str] = [],
    pharmacy_id: str = "",
    is_super_admin: bool = False,
    assigned_branches: List[str] = [],
    branch_scope: str = "assigned_branch",
    data_scope: str = "branch",
    # ── New hierarchy claims ──────────────────────────────────────────────────
    hierarchy_level: int = 4,
    # 1=Super Admin, 2=Pharmacy Owner, 3=Branch Owner, 4=Staff
    role_id: Optional[str] = None,
    # UUID of the EnterpriseRole — used by frontend to detect role changes
    permissions_version: Optional[str] = None,
    # ISO timestamp of role.updated_at — triggers re-login when permissions change
    expires_delta: timedelta = None,
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {
        "exp":                 expire,
        "sub":                 str(subject),
        "tenant_id":           tenant_id,
        "branch_id":           branch_id,
        "role":                role,
        "permissions":         permissions,
        "pharmacy_id":         pharmacy_id,
        "is_super_admin":      is_super_admin,
        "assigned_branches":   assigned_branches,
        "branch_scope":        branch_scope,
        "data_scope":          data_scope,
        # ── New hierarchy claims ──────────────────────────────────────────────
        "hierarchy_level":     hierarchy_level,
        "role_id":             role_id or "",
        "permissions_version": permissions_version or datetime.utcnow().isoformat(),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


