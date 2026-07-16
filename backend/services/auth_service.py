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

        # ── Resolve branch_id ─────────────────────────────────────────────
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

        # ── Resolve pharmacy_id ───────────────────────────────────────────
        # Look up the Pharmacy whose tenant_id matches the user's tenant
        from models.users import Pharmacy, SuperAdmin
        pharmacy = db.query(Pharmacy).filter(
            Pharmacy.tenant_id == user.tenant_id,
            Pharmacy.is_active == True,
        ).first()
        pharmacy_id = pharmacy.id if pharmacy else ""

        # ── Check super_admin status ──────────────────────────────────────
        is_sa = (
            user.is_super_admin  # legacy flag on User model
            or db.query(SuperAdmin).filter(
                SuperAdmin.auth_user_id == user.id,
                SuperAdmin.is_active == True,
            ).first() is not None
        )

        # ── Compute Effective Permissions ─────────────────────────────────
        from models.enterprise.user import EnterpriseUser
        from services.enterprise.user_service import user_service

        permissions = list(user.permissions) if user.permissions else []
        eu = db.query(EnterpriseUser).filter(EnterpriseUser.user_id == user.id).first()
        
        if eu:
            # If the user has an enterprise profile, calculate their effective enterprise permissions
            # Note: We pass the branch_id to also grab any branch-specific overrides if applicable
            ent_perms = user_service.compute_effective_permissions(db, enterprise_user=eu, branch_id=branch_id)
            # Merge and deduplicate
            permissions = list(set(permissions + ent_perms))
            
            # Use enterprise role name if available and not just a default
            if eu.enterprise_role:
                role_name = eu.enterprise_role.name
                if role_name == "Pharmacy Owner" and "*" not in permissions:
                    permissions.append("*")
                    
        # If user is a super admin, ensure they have wildcard
        if is_sa and "*" not in permissions:
            permissions.append("*")

        # ── Create JWT ────────────────────────────────────────────────────
        access_token = create_access_token(
            subject=user.id,
            tenant_id=user.tenant_id,
            branch_id=branch_id,
            role=role_name,
            permissions=permissions,
            pharmacy_id=pharmacy_id,    # ← NEW
            is_super_admin=is_sa,       # ← NEW
            branch_scope=user.branch_scope,
            data_scope=user.data_scope,
        )

        user_data = {
            "id":        user.id,
            "username":  user.username,
            "email":     user.email,
            "full_name": user.full_name,
            "role":      role_name,
            "permissions": permissions,
            "is_super_admin": is_sa,
        }

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_data,
            tenant_id=user.tenant_id,
            branch_id=branch_id,
        )

