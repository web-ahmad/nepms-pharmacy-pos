from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from core.security import verify_password, create_access_token
from repositories.auth import user_repo
from schemas.auth import UserLogin, Token

class AuthService:
    @staticmethod
    def authenticate_user(db: Session, login_data: UserLogin) -> Token:
        user = user_repo.get_by_username(db, username=login_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        # Create access token
        branch_id = ""
        if user.branches:
            branch_id = user.branches[0].branch_id
        else:
            from models.users import Branch
            branch = db.query(Branch).filter(Branch.tenant_id == user.tenant_id).first()
            if branch:
                branch_id = branch.id
            else:
                branch = db.query(Branch).first()
                if branch:
                    branch_id = branch.id
        role_name = user.role.name if user.role else "User"

        access_token = create_access_token(
            subject=user.id,
            tenant_id=user.tenant_id,
            branch_id=branch_id,
            role=role_name,
            permissions=user.permissions
        )
        
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": role_name,
            "permissions": user.permissions
        }
        
        return Token(
            access_token=access_token, 
            token_type="bearer",
            user=user_data,
            tenant_id=user.tenant_id,
            branch_id=branch_id
        )
