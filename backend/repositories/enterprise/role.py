"""
repositories/enterprise/role.py
─────────────────────────────────
Data-access layer for EnterpriseRole and EnterprisePermission.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

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


# ── Permission seed data ───────────────────────────────────────────────────────

PERMISSION_SEED: List[Dict] = []
_MODULES = [
    ("dashboard",        ["view", "export"]),
    ("pos",              ["view", "create_order", "void_sale", "apply_discount", "manage"]),
    ("inventory",        ["view", "manage", "adjust_stock", "write_off", "export"]),
    ("purchase",         ["view", "create", "approve", "manage", "export"]),
    ("sales",            ["view", "create", "return", "export"]),
    ("returns",          ["view", "create", "approve", "manage"]),
    ("customers",        ["view", "create", "manage", "export"]),
    ("suppliers",        ["view", "create", "manage", "export"]),
    ("reports",          ["view", "export", "schedule"]),
    ("accounts",         ["view", "create", "manage", "export"]),
    ("hr",               ["view", "create", "manage"]),
    ("settings",         ["view", "manage", "system"]),
    ("branch_management",["view", "create", "manage", "assign_users"]),
    ("audit",            ["view", "export", "manage"]),
    ("backup",           ["view", "create", "restore"]),
    ("users",            ["view", "create", "manage", "suspend", "unlock", "reset_password"]),
]

_SENSITIVE = {
    "pos:void_sale", "pos:apply_discount",
    "inventory:write_off", "purchase:approve", "returns:approve",
    "settings:system", "audit:manage", "backup:restore",
    "users:reset_password", "users:suspend",
}

for _module, _actions in _MODULES:
    for _action in _actions:
        _code = f"{_module}:{_action}"
        PERMISSION_SEED.append({
            "module":       _module,
            "action":       _action,
            "code":         _code,
            "label":        f"{_module.replace('_',' ').title()} — {_action.replace('_',' ').title()}",
            "is_sensitive": _code in _SENSITIVE,
        })


# ── RoleRepository ─────────────────────────────────────────────────────────────

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
        limit: int = 100,
    ) -> Tuple[List[EnterpriseRole], int]:
        q = (
            db.query(EnterpriseRole)
            .options(joinedload(EnterpriseRole.role_permissions))
            .filter(
                EnterpriseRole.pharmacy_id == pharmacy_id,
                EnterpriseRole.is_deleted == False,
            )
            .order_by(EnterpriseRole.sort_order.asc(), EnterpriseRole.name.asc())
        )
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
            # Delete existing then re-add
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

        # Copy permissions
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

    # ── Permission helpers ─────────────────────────────────────────────────────

    def _set_permissions(self, db: Session, role_id: str, permission_ids: List[str]) -> None:
        for pid in permission_ids:
            rp = EnterpriseRolePermission(role_id=role_id, permission_id=pid)
            db.add(rp)

    def get_all_permissions(self, db: Session) -> List[EnterprisePermission]:
        return (
            db.query(EnterprisePermission)
            .order_by(EnterprisePermission.module.asc(), EnterprisePermission.action.asc())
            .all()
        )

    def seed_permissions(self, db: Session, pharmacy_id: str) -> List[EnterprisePermission]:
        """Idempotent seed — inserts missing permissions."""
        existing_codes = {
            p.code for p in db.query(EnterprisePermission.code).filter(
                EnterprisePermission.pharmacy_id == pharmacy_id
            ).all()
        }
        created = []
        for seed in PERMISSION_SEED:
            if seed["code"] not in existing_codes:
                perm = EnterprisePermission(
                    pharmacy_id=pharmacy_id,
                    **seed
                )
                db.add(perm)
                created.append(perm)
        if created:
            db.commit()
        return created

    def seed_default_roles(self, db: Session, pharmacy_id: str) -> List[EnterpriseRole]:
        """Seed system-default roles for a new pharmacy."""
        existing_names = {
            r.name for r in db.query(EnterpriseRole.name).filter(
                EnterpriseRole.pharmacy_id == pharmacy_id,
                EnterpriseRole.is_system_default == True,
            ).all()
        }
        defaults = [
            {"name": "Pharmacy Owner",  "color": "#f59e0b", "icon": "Crown",      "user_type": "pharmacy_owner"},
            {"name": "Branch Manager",  "color": "#6366f1", "icon": "Building2",  "user_type": "branch_manager"},
            {"name": "Pharmacist",      "color": "#10b981", "icon": "Stethoscope","user_type": "pharmacist"},
            {"name": "Cashier",         "color": "#3b82f6", "icon": "Wallet",     "user_type": "cashier"},
            {"name": "Store Keeper",    "color": "#8b5cf6", "icon": "Package",    "user_type": "store_keeper"},
            {"name": "Auditor",         "color": "#ef4444", "icon": "ShieldCheck","user_type": "auditor"},
            {"name": "Read Only",       "color": "#6b7280", "icon": "Eye",        "user_type": "read_only"},
        ]
        created = []
        for d in defaults:
            if d["name"] not in existing_names:
                role = EnterpriseRole(
                    pharmacy_id=pharmacy_id,
                    is_system_default=True,
                    description=f"System default role for {d['name']}",
                    **d,
                )
                db.add(role)
                created.append(role)
        if created:
            db.commit()
        return created


role_repository = RoleRepository(EnterpriseRole)
