from typing import Generator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import SessionLocal
from core.config import settings
from models.users import User, Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

from core.audit_context import set_audit_context, current_user_id, current_tenant_id, current_branch_id

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
        
    # Set context for audit
    current_user_id.set(user.id)
    return user

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
            
        # Set context for audit
        current_tenant_id.set(tenant_id)
        current_branch_id.set(branch_id)
        
        return TenantContext(tenant_id=tenant_id, branch_id=branch_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

class RequirePermissions:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.is_super_admin:
            return current_user
            
        if not current_user.role or current_user.role.name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user

class requires_permission:
    def __init__(self, permission_code: str):
        self.permission_code = permission_code

    def __call__(self, token: str = Depends(oauth2_scheme)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            permissions = payload.get("permissions", [])
            role = payload.get("role", "")
            
            if role == "Owner" or "*" in permissions:
                return payload
                
            if self.permission_code not in permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission: {self.permission_code}"
                )
            return payload
        except JWTError:
            raise credentials_exception

def get_token_payload(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
