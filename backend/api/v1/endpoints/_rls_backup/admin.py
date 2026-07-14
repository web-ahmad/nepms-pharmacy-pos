from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.users import User, Role, Permission, RolePermission
from core.deps import get_current_user, requires_permission
from schemas.auth import UserResponse, UserCreate
from pydantic import BaseModel
from typing import List
from core.security import get_password_hash
from fastapi import HTTPException

router = APIRouter()

def require_users_manage(token_payload: dict = Depends(requires_permission("users:manage"))): return token_payload
def require_roles_manage(token_payload: dict = Depends(requires_permission("users:manage"))): return token_payload

@router.get("/users", response_model=list[UserResponse])
def list_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), token_payload: dict = Depends(require_users_manage)):
    # Standard users list for admin center
    return db.query(User).filter(User.tenant_id == current_user.tenant_id).all()

@router.post("/users", response_model=UserResponse)
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), token_payload: dict = Depends(require_users_manage)):
    # Check if user exists
    if db.query(User).filter(User.username == user_in.username).first() or db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")
        
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=user_in.role_id,
        tenant_id=current_user.tenant_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/roles")
def list_roles(db: Session = Depends(get_db), token_payload: dict = Depends(require_roles_manage)):
    roles = db.query(Role).all()
    return [{"id": r.id, "name": r.name, "description": r.description, "is_system_default": r.is_system_default, "permissions": [rp.permission.code for rp in r.role_permissions if rp.permission]} for r in roles]

class RoleCreateUpdate(BaseModel):
    name: str
    description: str | None = None
    permissions: List[str]  # List of permission codes

@router.post("/roles")
def create_role(role_in: RoleCreateUpdate, db: Session = Depends(get_db), token_payload: dict = Depends(require_roles_manage)):
    if db.query(Role).filter(Role.name == role_in.name).first():
        raise HTTPException(status_code=400, detail="Role name already exists")
    import uuid
    new_role = Role(
        id=str(uuid.uuid4()),
        name=role_in.name,
        description=role_in.description,
        is_system_default=False
    )
    db.add(new_role)
    db.flush()
    
    for code in role_in.permissions:
        perm = db.query(Permission).filter(Permission.code == code).first()
        if perm:
            db.add(RolePermission(id=str(uuid.uuid4()), role_id=new_role.id, permission_id=perm.id))
            
    db.commit()
    db.refresh(new_role)
    return {"id": new_role.id, "name": new_role.name, "description": new_role.description, "is_system_default": new_role.is_system_default, "permissions": [rp.permission.code for rp in new_role.role_permissions if rp.permission]}

@router.put("/roles/{role_id}")
def update_role(role_id: str, role_in: RoleCreateUpdate, db: Session = Depends(get_db), token_payload: dict = Depends(require_roles_manage)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system_default:
        raise HTTPException(status_code=400, detail="Cannot modify system default roles")
        
    role.name = role_in.name
    role.description = role_in.description
    
    db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
    db.flush()
    
    import uuid
    for code in role_in.permissions:
        perm = db.query(Permission).filter(Permission.code == code).first()
        if perm:
            db.add(RolePermission(id=str(uuid.uuid4()), role_id=role.id, permission_id=perm.id))
            
    db.commit()
    db.refresh(role)
    return {"id": role.id, "name": role.name, "description": role.description, "is_system_default": role.is_system_default, "permissions": [rp.permission.code for rp in role.role_permissions if rp.permission]}

@router.get("/permissions")
def list_permissions(db: Session = Depends(get_db), token_payload: dict = Depends(require_roles_manage)):
    perms = db.query(Permission).all()
    return [{"id": p.id, "module": p.module, "action": p.action, "code": p.code} for p in perms]

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role_id: str | None = None
    is_active: bool | None = None
    password: str | None = None

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token_payload: dict = Depends(require_users_manage)
):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.email is not None:
        # Check email not taken by another user
        existing = db.query(User).filter(User.email == user_in.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another user")
        user.email = user_in.email
    if user_in.role_id is not None:
        user.role_id = user_in.role_id
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)
    return user

