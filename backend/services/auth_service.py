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

        # ── Resolve EnterpriseUser profile (single source of truth) ───────────
        from models.enterprise.user import EnterpriseUser
        from services.enterprise.user_service import user_service
        from models.users import Branch, Pharmacy, SuperAdmin

        eu = db.query(EnterpriseUser).filter(
            EnterpriseUser.user_id == user.id,
            EnterpriseUser.is_deleted == False,
        ).first()

        # ── Resolve Super Admin status (JWT flag + DB double-check) ────────────
        # is_super_admin = true means Level 1 (SaaS only). Never use role name.
        is_sa = (
            user.is_super_admin
            or db.query(SuperAdmin).filter(
                SuperAdmin.auth_user_id == user.id,
                SuperAdmin.is_active == True,
            ).first() is not None
        )

        # ── Resolve role & hierarchy_level ─────────────────────────────────────
        # RULE: ALWAYS read hierarchy_level from EnterpriseRole.hierarchy_level.
        # NEVER compare role names (e.g. role_name == "Owner") — this is fragile
        # and breaks any custom-named role. The DB field is the source of truth.
        role_name           = "Staff"
        role_id             = None
        hierarchy_level     = 1 if is_sa else 4
        branch_scope        = "global" if is_sa else "assigned_branch"
        data_scope          = "saas_only" if is_sa else "branch"
        permissions_version = None

        if is_sa:
            role_name       = "Super Admin"
            hierarchy_level = 1
            branch_scope    = "global"
            data_scope      = "saas_only"

        elif eu and eu.enterprise_role:
            er                  = eu.enterprise_role
            role_name           = er.name
            role_id             = er.id
            # ✅ Use the DB field directly — no role name string matching
            hierarchy_level     = er.hierarchy_level  # 1=SuperAdmin 2=Owner 3=BranchOwner 4=Staff
            # L2 Pharmacy Owner: all branches scope
            # L3 Branch Owner: assigned branch scope (same permissions, data_scope limits)
            if hierarchy_level == 2:
                branch_scope    = "all_branches"
                data_scope      = "tenant"
            elif hierarchy_level == 3:
                branch_scope    = "assigned_branch"
                data_scope      = "branch"
            else:
                branch_scope    = er.branch_scope or "assigned_branch"
                data_scope      = er.data_scope   or "branch"
            permissions_version = er.updated_at.isoformat() if er.updated_at else None

        elif user.role:
            # Legacy fallback — derive level from role.hierarchy_level if it exists
            role_name       = user.role.name
            role_id         = user.role.id
            # Use hierarchy_level column if present; default to 4 (Staff)
            legacy_level    = getattr(user.role, "hierarchy_level", None)
            hierarchy_level = legacy_level if legacy_level in (1, 2, 3, 4) else 4
            if hierarchy_level == 2:
                branch_scope    = "all_branches"
                data_scope      = "tenant"
            elif hierarchy_level == 3:
                branch_scope    = "assigned_branch"
                data_scope      = "branch"
            else:
                branch_scope    = user.role.branch_scope or "assigned_branch"
                data_scope      = user.role.data_scope   or "branch"

        # ── Resolve branch_id & assigned_branches ──────────────────────────────
        assigned_branches = []
        branch_id = ""

        if is_sa:
            # Super Admin: list all branches for impersonation UI, no real scope
            branches = db.query(Branch).filter(Branch.tenant_id == user.tenant_id).all()
            for b in branches:
                assigned_branches.append({"id": b.id, "name": b.name})
            if branches:
                branch_id = branches[0].id

        elif eu and eu.branch_assignments:
            # Enterprise branch assignments (primary path)
            default_assignment = None
            for assignment in eu.branch_assignments:
                if assignment.is_active and assignment.branch:
                    assigned_branches.append({
                        "id":   assignment.branch.id,
                        "name": assignment.branch.name,
                    })
                    if assignment.is_default_branch:
                        default_assignment = assignment
            if default_assignment:
                branch_id = default_assignment.branch.id
            elif assigned_branches:
                branch_id = assigned_branches[0]["id"]

        elif user.branches:
            # Legacy UserBranch fallback
            branch_id = user.branches[0].branch_id
            for ub in user.branches:
                assigned_branches.append({
                    "id":   ub.branch_id,
                    "name": getattr(ub.branch, "name", "Assigned Branch"),
                })

        else:
            # Last resort: grab first branch of tenant
            branch = db.query(Branch).filter(Branch.tenant_id == user.tenant_id).first()
            if branch:
                branch_id = branch.id
                assigned_branches.append({"id": branch.id, "name": branch.name})

        # ── Resolve pharmacy_id ────────────────────────────────────────────────
        pharmacy = db.query(Pharmacy).filter(
            Pharmacy.tenant_id == user.tenant_id,
            Pharmacy.is_active == True,
        ).first()
        pharmacy_id = pharmacy.id if pharmacy else ""
        pharmacy_name = pharmacy.name if pharmacy else "Main Pharmacy"

        # ── Compute effective permissions ──────────────────────────────────────
        # L1 Super Admin:    system:* permissions only — NEVER pharmacy data
        # L2 Pharmacy Owner: wildcard "*" in JWT (all operations, tenant scope)
        # L3 Branch Owner:   explicit permission codes from role (same as L2 set),
        #                    but data_scope='branch' in JWT enforces isolation at query layer
        # L4 Branch Staff:   granular codes only, assigned by L2/L3
        if is_sa:
            permissions = [
                "system:view", "system:license", "system:subscription", "system:billing",
                "system:updates", "system:monitoring", "system:impersonate",
            ]
        elif hierarchy_level == 2:
            # Pharmacy Owner: full wildcard access within their tenant
            permissions = ["*"]
        elif hierarchy_level == 3 and eu:
            # Branch Owner: full operational permission codes (isolation via data_scope=branch)
            permissions = user_service.compute_effective_permissions(
                db, enterprise_user=eu, branch_id=branch_id
            )
        elif eu:
            # L4 Staff: granular permissions only
            permissions = user_service.compute_effective_permissions(
                db, enterprise_user=eu, branch_id=branch_id
            )
        else:
            permissions = list(user.permissions) if user.permissions else []

        # ── Create JWT ─────────────────────────────────────────────────────────
        access_token = create_access_token(
            subject             = user.id,
            tenant_id           = user.tenant_id or "",
            branch_id           = branch_id,
            role                = role_name,
            permissions         = permissions,
            pharmacy_id         = pharmacy_id,
            is_super_admin      = is_sa,
            assigned_branches   = [b["id"] for b in assigned_branches],
            branch_scope        = branch_scope,
            data_scope          = data_scope,
            hierarchy_level     = hierarchy_level,
            role_id             = role_id,
            permissions_version = permissions_version,
        )

        user_data = {
            "id":                  user.id,
            "username":            user.username,
            "email":               user.email,
            "full_name":           user.full_name,
            "role":                role_name,
            "role_id":             role_id,
            "hierarchy_level":     hierarchy_level,
            "permissions":         permissions,
            "permissions_version": permissions_version,
            "is_super_admin":      is_sa,
            "assigned_branches":   assigned_branches,
            "pharmacy_name":       pharmacy_name,
        }

        return Token(
            access_token = access_token,
            token_type   = "bearer",
            user         = user_data,
            tenant_id    = user.tenant_id or "",
            branch_id    = branch_id,
        )


auth_service = AuthService()
