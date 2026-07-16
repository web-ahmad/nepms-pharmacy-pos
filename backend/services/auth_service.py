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

        # ── Resolve enterprise user & SA status ───────────────────────────
        from models.enterprise.user import EnterpriseUser
        from services.enterprise.user_service import user_service
        from models.users import Branch, Pharmacy, SuperAdmin

        eu = db.query(EnterpriseUser).filter(EnterpriseUser.user_id == user.id).first()
        is_sa = (
            user.is_super_admin
            or db.query(SuperAdmin).filter(
                SuperAdmin.auth_user_id == user.id,
                SuperAdmin.is_active == True,
            ).first() is not None
        )

        role_name = user.role.name if user.role else "User"
        if eu and eu.enterprise_role:
            role_name = eu.enterprise_role.name

        # ── Resolve branch_id & assigned_branches ─────────────────────────
        assigned_branches = []
        branch_id = ""
        
        if is_sa:
            branches = db.query(Branch).filter(Branch.tenant_id == user.tenant_id).all()
            for b in branches:
                assigned_branches.append({"id": b.id, "name": b.name})
            if branches:
                branch_id = branches[0].id
        elif eu and eu.branch_assignments:
            default_assignment = None
            for assignment in eu.branch_assignments:
                if assignment.is_active and assignment.branch:
                    assigned_branches.append({
                        "id": assignment.branch.id,
                        "name": assignment.branch.name
                    })
                    if assignment.is_default_branch:
                        default_assignment = assignment
            if default_assignment:
                branch_id = default_assignment.branch.id
            elif assigned_branches:
                branch_id = assigned_branches[0]["id"]
        elif user.branches:
            branch_id = user.branches[0].branch_id
            for ub in user.branches:
                assigned_branches.append({"id": ub.branch_id, "name": getattr(ub.branch, "name", "Assigned Branch")})
        else:
            branch = db.query(Branch).filter(Branch.tenant_id == user.tenant_id).first()
            if branch:
                branch_id = branch.id
                assigned_branches.append({"id": branch.id, "name": branch.name})

        # ── Resolve pharmacy_id ───────────────────────────────────────────
        pharmacy = db.query(Pharmacy).filter(
            Pharmacy.tenant_id == user.tenant_id,
            Pharmacy.is_active == True,
        ).first()
        pharmacy_id = pharmacy.id if pharmacy else ""

        # ── Compute Effective Permissions ─────────────────────────────────
        permissions = list(user.permissions) if user.permissions else []
        
        if eu:
            ent_perms = user_service.compute_effective_permissions(db, enterprise_user=eu, branch_id=branch_id)
            permissions = list(set(permissions + ent_perms))
            
            if role_name == "Pharmacy Owner" and "*" not in permissions:
                permissions.append("*")
                    
        if is_sa and "*" not in permissions:
            permissions.append("*")

        # ── Create JWT ────────────────────────────────────────────────────
        access_token = create_access_token(
            subject=user.id,
            tenant_id=user.tenant_id,
            branch_id=branch_id,
            role=role_name,
            permissions=permissions,
            pharmacy_id=pharmacy_id,
            is_super_admin=is_sa,
            assigned_branches=[b["id"] for b in assigned_branches],
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
            "assigned_branches": assigned_branches,
        }

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_data,
            tenant_id=user.tenant_id,
            branch_id=branch_id,
        )

