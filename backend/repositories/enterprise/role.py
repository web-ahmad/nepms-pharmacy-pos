"""
repositories/enterprise/role.py
─────────────────────────────────
Data-access layer for EnterpriseRole and EnterprisePermission.

Enterprise RBAC 3.0 — 85 modules, ~800 permissions, 27 default roles.
Permission inheritance: module:manage automatically grants all base actions.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from models.enterprise.user import (
    EnterpriseRole,
    EnterprisePermission,
    EnterpriseRolePermission,
    EnterpriseUser,
)
from repositories.base import CRUDBase
from schemas.enterprise.user import RoleCreate, RoleUpdate


# ══════════════════════════════════════════════════════════════════════════════
# ENTERPRISE MODULE CATALOG
# Format: (module_key, [actions])
# Only actions that genuinely apply are listed.
# ══════════════════════════════════════════════════════════════════════════════

# NOTE: This catalog is deliberately curated to the modules that ACTUALLY exist
# in the software. Every permission code here is either enforced by a backend
# `requires_permission(...)` guard or used by a frontend sidebar/route gate — no
# fictional/aspirational permissions. Grouped module-by-module with just the
# actions each module really supports (view + the real write/approve actions).
_MODULES: List[Tuple[str, List[str]]] = [
    # ── Overview ───────────────────────────────────────────────────────────────
    ("dashboard",       ["view", "export"]),
    ("analytics",       ["view", "export"]),

    # ── Point of Sale & Sales ──────────────────────────────────────────────────
    ("pos",             ["view", "create", "return", "hold", "discount", "void", "print"]),
    ("cashier",         ["view", "manage", "print"]),
    ("sales",           ["view", "create", "update", "return", "refund", "discount", "void", "export", "print"]),

    # ── Customers & Marketing ──────────────────────────────────────────────────
    ("customers",       ["view", "create", "update", "delete", "credit", "export"]),
    ("prescriptions",   ["view", "create", "edit", "delete", "print"]),
    ("marketing",       ["view", "create", "update", "delete", "export"]),

    # ── Inventory ──────────────────────────────────────────────────────────────
    ("inventory",       ["view", "create", "edit", "delete", "manage", "transfer", "export"]),
    ("stock",           ["adjust"]),
    ("medicines",       ["view", "create", "edit", "delete", "export"]),
    ("physical_audit",  ["view", "create", "approve", "export"]),

    # ── Purchase ───────────────────────────────────────────────────────────────
    ("purchase",        ["view", "create", "update", "manage", "approve", "return", "export",
                         "matrix:manage", "request:approve", "order:create"]),
    ("suppliers",       ["view", "create", "update", "delete", "export"]),

    # ── Accounts ───────────────────────────────────────────────────────────────
    ("accounts",        ["view", "create", "closing", "manage_bank", "export"]),
    ("expenses",        ["view", "create", "update", "delete", "approve"]),

    # ── Reports ────────────────────────────────────────────────────────────────
    ("reports",         ["view", "export", "print", "sales", "inventory", "purchase",
                         "financial", "hr", "customers"]),

    # ── HR & Payroll ───────────────────────────────────────────────────────────
    ("hr",              ["view", "create", "update", "manage", "export"]),
    ("payroll",         ["view", "create", "approve"]),

    # ── Governance ─────────────────────────────────────────────────────────────
    ("compliance",      ["view", "export"]),
    ("audit",           ["view", "export"]),
    ("branches",        ["view", "create", "edit", "delete", "export"]),

    # ── Access Control ─────────────────────────────────────────────────────────
    ("users",           ["view", "create", "update", "manage", "suspend", "unlock", "reset_password"]),
    ("roles",           ["view", "create", "update", "delete", "manage"]),

    # ── Configuration ──────────────────────────────────────────────────────────
    ("settings",        ["view", "update", "manage"]),
    ("notifications",   ["view", "manage"]),

    # ── System (Super Admin only) ──────────────────────────────────────────────
    ("system_health",   ["view"]),
    ("backup",          ["manage"]),
    ("super_admin",     ["view", "manage"]),
]


# ── Sensitive permission codes ─────────────────────────────────────────────────

_SENSITIVE_CODES: Set[str] = {
    "pos:void", "pos:return", "sales:void", "sales:refund", "sales:return",
    "inventory:delete", "stock:adjust", "physical_audit:approve",
    "purchase:approve", "purchase:matrix:manage", "purchase:request:approve",
    "accounts:closing", "accounts:manage_bank",
    "expenses:approve", "payroll:approve", "payroll:create",
    "backup:manage", "settings:manage",
    "users:suspend", "users:unlock", "users:reset_password", "users:manage",
    "roles:delete", "roles:manage",
    "branches:edit", "branches:delete",
    "super_admin:manage",
}


# ── Build flat permission seed list ───────────────────────────────────────────

def _build_permission_seed() -> List[Dict]:
    result: List[Dict] = []
    for module, actions in _MODULES:
        for action in actions:
            code = f"{module}:{action}"
            result.append({
                "module":       module,
                "action":       action,
                "code":         code,
                "label":        f"{module.replace('_', ' ').title()} — {action.replace('_', ' ').replace(':', ' ').title()}",
                "description":  None,
                "is_sensitive": code in _SENSITIVE_CODES,
            })
    return result


PERMISSION_SEED: List[Dict] = _build_permission_seed()


# ── Permission Inheritance ─────────────────────────────────────────────────────
# module:manage → grants view + create + update + delete + export (where they exist)

_MANAGE_GRANTS: List[str] = ["view", "create", "update", "delete", "export"]

_MODULE_ACTIONS: Dict[str, Set[str]] = {}
for _m, _a in _MODULES:
    _MODULE_ACTIONS[_m] = set(_a)


def expand_permissions_with_inheritance(codes: List[str]) -> List[str]:
    """Expand permission list applying manage→base_actions inheritance."""
    if "*" in codes:
        return codes
    expanded: Set[str] = set(codes)
    for code in list(expanded):
        parts = code.split(":", 1)
        if len(parts) == 2 and parts[1] == "manage":
            module = parts[0]
            for base_action in _MANAGE_GRANTS:
                derived = f"{module}:{base_action}"
                if base_action in _MODULE_ACTIONS.get(module, set()):
                    expanded.add(derived)
    return sorted(expanded)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _perm(*codes: str) -> List[str]:
    """Expand permissions and return sorted unique list."""
    return expand_permissions_with_inheritance(list(codes))


def _merge(*perm_lists) -> List[str]:
    merged: Set[str] = set()
    for pl in perm_lists:
        merged.update(pl)
    return sorted(merged)


# ── Default Enterprise Roles ──────────────────────────────────────────────────

DEFAULT_ROLES: Dict[str, Dict] = {
    # ── System (L1) ────────────────────────────────────────────────────────────
    "Super Admin": {
        "hierarchy_level": 1,
        "branch_scope": "global",
        "data_scope":   "global",
        "color":        "#dc2626",
        "icon":         "ShieldAlert",
        "sort_order":   1,
        "is_system_role": True,
        "permissions":  ["*"],
    },
    # ── Tenant Owner (L2) — full access to the whole pharmacy, all branches ─────
    "Pharmacy Owner": {
        "hierarchy_level": 2,
        "branch_scope": "global",
        "data_scope":   "tenant",
        "color":        "#f59e0b",
        "icon":         "Crown",
        "sort_order":   2,
        "is_system_role": False,
        "permissions":  ["*tenant"],
    },
    # ── Branch head (L3) — full access to their own branch ─────────────────────
    "Franchise Owner": {
        "hierarchy_level": 3,
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#6366f1",
        "icon":         "Building2",
        "sort_order":   3,
        "is_system_role": False,
        "permissions":  ["*tenant-branch"],
    },
    # ── Branch staff (L4) — explicit, module-scoped permissions ────────────────
    "Accountant": {
        "hierarchy_level": 4,
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#22c55e",
        "icon":         "Calculator",
        "sort_order":   4,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view", "analytics:view",
            "accounts:view", "accounts:create", "accounts:closing",
            "accounts:manage_bank", "accounts:export",
            "expenses:view", "expenses:create", "expenses:update", "expenses:approve",
            "reports:view", "reports:export", "reports:financial",
            "reports:sales", "reports:purchase",
            "customers:view", "suppliers:view",
        ),
    },
    "Pharmacist": {
        "hierarchy_level": 4,
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#06b6d4",
        "icon":         "Pill",
        "sort_order":   5,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "pos:view", "pos:create", "pos:return", "pos:hold", "pos:print", "cashier:view",
            "sales:view", "sales:create", "sales:print",
            "inventory:view", "inventory:manage", "inventory:transfer", "stock:adjust",
            "medicines:view", "medicines:create", "medicines:edit", "physical_audit:view",
            "purchase:view",
            "prescriptions:view", "prescriptions:create", "prescriptions:edit", "prescriptions:delete",
            "customers:view", "customers:create",
            "reports:view",
        ),
    },
    "Cashier": {
        "hierarchy_level": 4,
        "branch_scope": "assigned_branch",
        "data_scope":   "own_records",
        "color":        "#f97316",
        "icon":         "CreditCard",
        "sort_order":   6,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "pos:view", "pos:create", "pos:return", "pos:hold", "pos:discount", "pos:print",
            "cashier:view", "cashier:manage",
            "sales:view", "sales:create", "sales:print",
            "customers:view", "customers:create",
        ),
    },
    "Salesman": {
        "hierarchy_level": 4,
        "branch_scope": "assigned_branch",
        "data_scope":   "own_records",
        "color":        "#ec4899",
        "icon":         "UserRound",
        "sort_order":   7,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "pos:view", "pos:create", "cashier:view",
            "sales:view", "sales:create", "sales:print", "sales:discount",
            "customers:view", "customers:create", "customers:update",
            "reports:view",
        ),
    },
    "HR": {
        "hierarchy_level": 4,
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#8b5cf6",
        "icon":         "Users",
        "sort_order":   8,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view", "analytics:view",
            "hr:view", "hr:create", "hr:update", "hr:manage",
            "payroll:view", "payroll:create", "payroll:approve",
            "reports:view", "reports:hr",
        ),
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# ROLE REPOSITORY
# ══════════════════════════════════════════════════════════════════════════════

class RoleRepository(CRUDBase[EnterpriseRole, RoleCreate, RoleUpdate]):

    def get_by_id(self, db: Session, role_id: str, pharmacy_id: str) -> Optional[EnterpriseRole]:
        return (
            db.query(EnterpriseRole)
            .options(joinedload(EnterpriseRole.role_permissions).joinedload(EnterpriseRolePermission.permission))
            .filter(
                EnterpriseRole.id == role_id,
                EnterpriseRole.pharmacy_id == pharmacy_id,
                EnterpriseRole.is_deleted == False,
            )
            .first()
        )

    def get_list(
        self,
        db: Session,
        pharmacy_id: str,
        *,
        skip: int = 0,
        limit: int = 200,
        exclude_system_roles: bool = True,
        min_hierarchy_level: Optional[int] = None,
    ) -> Tuple[List[EnterpriseRole], int]:
        q = (
            db.query(EnterpriseRole)
            .options(joinedload(EnterpriseRole.role_permissions))
            .filter(
                EnterpriseRole.pharmacy_id == pharmacy_id,
                EnterpriseRole.is_deleted == False,
            )
        )
        if exclude_system_roles:
            q = q.filter(EnterpriseRole.is_system_role == False)
            
        if min_hierarchy_level is not None:
            q = q.filter(EnterpriseRole.hierarchy_level >= min_hierarchy_level)

        q = q.order_by(EnterpriseRole.sort_order.asc(), EnterpriseRole.name.asc())
        total = q.count()
        items = q.offset(skip).limit(limit).all()
        return items, total

    def create_role(
        self,
        db: Session,
        *,
        data: RoleCreate,
        pharmacy_id: str,
        permission_ids: Optional[List[str]] = None,
    ) -> EnterpriseRole:
        role = EnterpriseRole(
            name=data.name,
            description=data.description,
            color=data.color,
            icon=data.icon,
            is_system_default=data.is_system_default,
            is_branch_specific=data.is_branch_specific,
            user_type=data.user_type,
            max_users=data.max_users,
            sort_order=data.sort_order,
            pharmacy_id=pharmacy_id,
        )
        db.add(role)
        db.flush()
        if permission_ids:
            self._set_permissions(db, role.id, permission_ids)
        db.commit()
        db.refresh(role)
        return role

    def update_role(
        self,
        db: Session,
        *,
        role: EnterpriseRole,
        data: RoleUpdate,
    ) -> EnterpriseRole:
        update_data = data.model_dump(exclude_unset=True)
        permission_ids = update_data.pop("permission_ids", None)
        for field, value in update_data.items():
            setattr(role, field, value)
        if permission_ids is not None:
            db.query(EnterpriseRolePermission).filter(
                EnterpriseRolePermission.role_id == role.id
            ).delete()
            self._set_permissions(db, role.id, permission_ids)
        db.commit()
        db.refresh(role)
        return role

    def clone_role(
        self,
        db: Session,
        *,
        source_role: EnterpriseRole,
        new_name: str,
        pharmacy_id: str,
        description: Optional[str] = None,
    ) -> EnterpriseRole:
        new_role = EnterpriseRole(
            name=new_name,
            description=description or f"Clone of {source_role.name}",
            color=source_role.color,
            icon=source_role.icon,
            is_system_default=False,
            is_branch_specific=source_role.is_branch_specific,
            user_type=source_role.user_type,
            max_users=source_role.max_users,
            sort_order=source_role.sort_order,
            pharmacy_id=pharmacy_id,
        )
        db.add(new_role)
        db.flush()
        source_pids = [rp.permission_id for rp in source_role.role_permissions]
        self._set_permissions(db, new_role.id, source_pids)
        db.commit()
        db.refresh(new_role)
        return new_role

    def set_permissions(self, db: Session, role_id: str, permission_ids: List[str]) -> None:
        db.query(EnterpriseRolePermission).filter(
            EnterpriseRolePermission.role_id == role_id
        ).delete()
        self._set_permissions(db, role_id, permission_ids)
        db.commit()

    def soft_delete(self, db: Session, role: EnterpriseRole) -> None:
        role.is_deleted = True
        db.commit()

    def get_user_count(self, db: Session, role_id: str) -> int:
        return (
            db.query(func.count(EnterpriseUser.id))
            .filter(
                EnterpriseUser.enterprise_role_id == role_id,
                EnterpriseUser.is_deleted == False,
            )
            .scalar() or 0
        )

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _set_permissions(self, db: Session, role_id: str, permission_ids: List[str]) -> None:
        for pid in permission_ids:
            rp = EnterpriseRolePermission(role_id=role_id, permission_id=pid)
            db.add(rp)

    def get_all_permissions(self, db: Session, pharmacy_id: str) -> List[EnterprisePermission]:
        return (
            db.query(EnterprisePermission)
            .filter(EnterprisePermission.pharmacy_id == pharmacy_id)
            .order_by(EnterprisePermission.module.asc(), EnterprisePermission.action.asc())
            .all()
        )

    # ── Idempotent seed ────────────────────────────────────────────────────────

    def seed_permissions(self, db: Session, pharmacy_id: str) -> List[EnterprisePermission]:
        """
        Insert only missing permissions.
        UNIQUE constraint on (pharmacy_id, code) prevents duplicates at DB level.
        Safe to run multiple times.
        """
        existing_codes: Set[str] = {
            row[0]
            for row in db.query(EnterprisePermission.code)
            .filter(EnterprisePermission.pharmacy_id == pharmacy_id)
            .all()
        }
        created: List[EnterprisePermission] = []
        for seed in PERMISSION_SEED:
            if seed["code"] not in existing_codes:
                perm = EnterprisePermission(pharmacy_id=pharmacy_id, **seed)
                db.add(perm)
                created.append(perm)
                existing_codes.add(seed["code"])
        if created:
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
        return created

    def seed_default_roles(self, db: Session, pharmacy_id: str) -> List[EnterpriseRole]:
        """
        Idempotent seed of 27 enterprise default roles.
        - Creates roles that don't exist yet.
        - Updates scope metadata on existing system roles.
        - Adds missing permission links (never removes custom ones).
        - Never deletes any role.
        """
        # Ensure permissions exist first
        all_perms: Dict[str, EnterprisePermission] = {
            p.code: p
            for p in db.query(EnterprisePermission)
            .filter(EnterprisePermission.pharmacy_id == pharmacy_id)
            .all()
        }
        if not all_perms:
            self.seed_permissions(db, pharmacy_id)
            all_perms = {
                p.code: p
                for p in db.query(EnterprisePermission)
                .filter(EnterprisePermission.pharmacy_id == pharmacy_id)
                .all()
            }

        existing_roles: Dict[str, EnterpriseRole] = {
            r.name: r
            for r in db.query(EnterpriseRole)
            .filter(
                EnterpriseRole.pharmacy_id == pharmacy_id,
                EnterpriseRole.is_deleted == False,
            )
            .all()
        }

        created: List[EnterpriseRole] = []

        for role_name, config in DEFAULT_ROLES.items():
            branch_scope = config["branch_scope"]
            data_scope   = config["data_scope"]
            perm_codes   = config["permissions"]

            role = existing_roles.get(role_name)

            if not role:
                role = EnterpriseRole(
                    name=role_name,
                    description=f"Enterprise system role: {role_name}",
                    color=config.get("color", "#6366f1"),
                    icon=config.get("icon"),
                    is_system_default=True,
                    is_system_role=config.get("is_system_role", False),
                    branch_scope=branch_scope,
                    data_scope=data_scope,
                    sort_order=config.get("sort_order", 99),
                    hierarchy_level=config.get("hierarchy_level", 4),
                    pharmacy_id=pharmacy_id,
                )
                db.add(role)
                db.flush()
                existing_roles[role_name] = role
                created.append(role)
            else:
                # Update scope metadata for existing system roles
                if role.is_system_default:
                    role.branch_scope = branch_scope
                    role.data_scope   = data_scope
                    role.color        = config.get("color", role.color)
                    role.sort_order   = config.get("sort_order", role.sort_order)
                    role.is_system_role = config.get("is_system_role", False)
                    role.hierarchy_level = config.get("hierarchy_level", 4)

            # Get existing permission links for this role
            existing_rp_perm_ids: Set[str] = {
                row[0]
                for row in db.query(EnterpriseRolePermission.permission_id)
                .filter(EnterpriseRolePermission.role_id == role.id)
                .all()
            }

            # Determine which codes to assign
            if "*" in perm_codes:
                codes_to_add = list(all_perms.keys())
            elif "*tenant" in perm_codes or "*tenant-branch" in perm_codes:
                saas_prefixes = (
                    "tenant:", "subscription:", "billing:", "saas_settings:", 
                    "feature_flags:", "system_health:", "system_logs:", 
                    "backups:", "superadmin_audit:", "superadmin:", "system:", "super_admin:"
                )
                codes_to_add = [code for code in all_perms.keys() if not code.startswith(saas_prefixes)]
                
                if "*tenant-branch" in perm_codes:
                    # L3+ (Branch Level) gets ZERO access to branches & branch_settings
                    # L3+ also cannot assign branches to users
                    codes_to_add = [
                        code for code in codes_to_add 
                        if not code.startswith("branches:") 
                        and not code.startswith("branch_settings:")
                        and code != "users:assign_branch"
                    ]
                else:
                    # L2 (Pharmacy Owner) gets ONLY view access to branches
                    codes_to_add = [
                        code for code in codes_to_add 
                        if not (code.startswith("branches:") and code != "branches:view")
                    ]
                    
                if "tenant:create" in codes_to_add:
                    codes_to_add.remove("tenant:create")
            else:
                codes_to_add = perm_codes
                
            # Deduplicate the list to ensure no duplicates exist before inserting
            codes_to_add = list(set(codes_to_add))

            for code in codes_to_add:
                perm = all_perms.get(code)
                if perm and perm.id not in existing_rp_perm_ids:
                    db.add(EnterpriseRolePermission(role_id=role.id, permission_id=perm.id))
                    existing_rp_perm_ids.add(perm.id)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise

        return created


role_repository = RoleRepository(EnterpriseRole)

