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

_MODULES: List[Tuple[str, List[str]]] = [
    # ── Dashboard & Analytics ──────────────────────────────────────────────────
    ("dashboard",              ["view", "export"]),
    ("analytics",              ["view", "export"]),
    ("executive_dashboard",    ["view", "export"]),

    # ── POS & Sales ───────────────────────────────────────────────────────────
    ("pos",                    ["view", "create", "update", "manage", "approve", "void", "print"]),
    ("cashier",                ["view", "create", "manage", "print"]),
    ("sales",                  ["view", "create", "update", "manage", "approve", "void", "export", "print"]),
    ("sales_returns",          ["view", "create", "approve", "manage", "export", "print"]),

    # ── Customers & CRM ───────────────────────────────────────────────────────
    ("customers",              ["view", "create", "update", "delete", "manage", "export", "print"]),
    ("customer_wallet",        ["view", "create", "update", "manage", "approve"]),
    ("customer_loyalty",       ["view", "create", "update", "manage", "export"]),
    ("customer_referrals",     ["view", "create", "manage", "export"]),
    ("crm",                    ["view", "create", "update", "delete", "manage", "export"]),
    ("marketing",              ["view", "create", "update", "delete", "manage", "export"]),
    ("campaigns",              ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("coupons",                ["view", "create", "update", "delete", "manage", "export"]),
    ("gift_vouchers",          ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),

    # ── Clinical ──────────────────────────────────────────────────────────────
    ("prescriptions",          ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("doctors",                ["view", "create", "update", "delete", "manage", "export"]),

    # ── Inventory ─────────────────────────────────────────────────────────────
    ("inventory",              ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("medicines",              ["view", "create", "update", "delete", "manage", "export", "print"]),
    ("medicine_categories",    ["view", "create", "update", "delete", "manage"]),
    ("medicine_brands",        ["view", "create", "update", "delete", "manage"]),
    ("medicine_manufacturers", ["view", "create", "update", "delete", "manage"]),
    ("medicine_generics",      ["view", "create", "update", "delete", "manage"]),
    ("medicine_units",         ["view", "create", "update", "delete", "manage"]),
    ("medicine_strengths",     ["view", "create", "update", "delete", "manage"]),
    ("medicine_dosage_forms",  ["view", "create", "update", "delete", "manage"]),
    ("medicine_routes",        ["view", "create", "update", "delete", "manage"]),
    ("medicine_interactions",  ["view", "create", "update", "delete", "manage"]),
    ("medicine_batches",       ["view", "create", "update", "delete", "manage", "export"]),
    ("warehouses",             ["view", "create", "update", "delete", "manage", "export"]),
    ("rack_management",        ["view", "create", "update", "delete", "manage"]),
    ("stock_transfers",        ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("stock_reservations",     ["view", "create", "update", "delete", "manage", "approve"]),
    ("physical_audit",         ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("inventory_adjustments",  ["view", "create", "approve", "manage", "export", "print"]),

    # ── Purchase ──────────────────────────────────────────────────────────────
    ("purchase",               ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("purchase_requests",      ["view", "create", "update", "delete", "manage", "approve", "export"]),
    ("purchase_quotations",    ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("purchase_orders",        ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("goods_receiving",        ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("purchase_returns",       ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("suppliers",              ["view", "create", "update", "delete", "manage", "export"]),
    ("supplier_payments",      ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("supplier_ledger",        ["view", "export", "print"]),

    # ── Accounting ────────────────────────────────────────────────────────────
    ("accounting",             ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("chart_of_accounts",      ["view", "create", "update", "delete", "manage", "export"]),
    ("journal_entries",        ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("general_ledger",         ["view", "export", "print"]),
    ("cash_book",              ["view", "create", "update", "manage", "export", "print"]),
    ("bank_book",              ["view", "create", "update", "manage", "export", "print"]),
    ("receivables",            ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("payables",               ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("expenses",               ["view", "create", "update", "delete", "manage", "approve", "export", "print"]),
    ("fixed_assets",           ["view", "create", "update", "delete", "manage", "export"]),
    ("profit_loss",            ["view", "export", "print"]),
    ("balance_sheet",          ["view", "export", "print"]),
    ("trial_balance",          ["view", "export", "print"]),
    ("tax_management",         ["view", "create", "update", "delete", "manage", "export"]),

    # ── HR ────────────────────────────────────────────────────────────────────
    ("hr",                     ["view", "create", "update", "manage", "export"]),
    ("employees",              ["view", "create", "update", "delete", "manage", "export", "print"]),
    ("attendance",             ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("leaves",                 ["view", "create", "update", "manage", "approve", "export"]),
    ("payroll",                ["view", "create", "update", "manage", "approve", "export", "print"]),
    ("payroll_setup",          ["view", "create", "update", "manage"]),
    ("departments",            ["view", "create", "update", "delete", "manage"]),
    ("designations",           ["view", "create", "update", "delete", "manage"]),
    ("shifts",                 ["view", "create", "update", "delete", "manage"]),
    ("training",               ["view", "create", "update", "delete", "manage", "export"]),
    ("performance_reviews",    ["view", "create", "update", "manage", "approve", "export"]),
    ("employee_tasks",         ["view", "create", "update", "delete", "manage"]),
    ("employee_documents",     ["view", "create", "update", "delete", "manage", "export"]),
    ("org_chart",              ["view", "export"]),

    # ── Organization ──────────────────────────────────────────────────────────
    ("branches",               ["view", "create", "update", "delete", "manage", "export"]),
    ("branch_settings",        ["view", "update", "manage"]),

    # ── Reports & BI ──────────────────────────────────────────────────────────
    ("reports",                ["view", "create", "manage", "export", "print"]),
    ("bi_reports",             ["view", "create", "manage", "export"]),
    ("report_builder",         ["view", "create", "update", "delete", "manage", "export"]),

    # ── System & Ops ──────────────────────────────────────────────────────────
    ("notifications",          ["view", "create", "update", "manage"]),
    ("compliance",             ["view", "create", "update", "manage", "approve", "export"]),
    ("ocr_queue",              ["view", "create", "update", "manage"]),
    ("system_health",          ["view", "manage"]),
    ("backups",                ["view", "create", "restore", "manage"]),
    ("system_logs",            ["view", "export", "manage"]),

    # ── Audit ─────────────────────────────────────────────────────────────────
    ("audit",                  [
        "view", "export", "manage",
        "investigate", "risk", "compliance",
        "delete_logs", "restore_logs", "system",
    ]),

    # ── Access Control ────────────────────────────────────────────────────────
    ("users",                  [
        "view", "create", "update", "delete", "manage",
        "suspend", "unlock", "reset_password",
        "assign_role", "assign_branch", "export",
    ]),
    ("roles",                  ["view", "create", "update", "delete", "manage"]),
    ("permissions",            ["view", "manage"]),

    # ── Settings (granular) ───────────────────────────────────────────────────
    ("settings",               [
        "view", "company", "invoice", "tax", "crm",
        "inventory", "hr", "pos", "security", "api",
        "modules", "system",
    ]),

    # ── Super Admin ───────────────────────────────────────────────────────────
    ("super_admin",            ["view", "manage", "system"]),
]


# ── Sensitive permission codes ─────────────────────────────────────────────────

_SENSITIVE_CODES: Set[str] = {
    "pos:void", "sales:void", "sales_returns:approve",
    "inventory:delete", "inventory_adjustments:approve",
    "inventory_adjustments:create", "stock_transfers:approve",
    "physical_audit:approve", "supplier_payments:approve",
    "journal_entries:approve", "expenses:approve",
    "payroll:approve", "payroll:manage",
    "backups:restore", "backups:manage",
    "audit:delete_logs", "audit:restore_logs", "audit:manage", "audit:system",
    "users:delete", "users:suspend", "users:unlock",
    "users:reset_password", "users:assign_role", "users:assign_branch",
    "settings:security", "settings:api", "settings:system", "settings:modules",
    "super_admin:manage", "super_admin:system",
    "roles:delete", "permissions:manage",
    "purchase_orders:approve", "goods_receiving:approve",
    "purchase_returns:approve", "cash_book:manage", "bank_book:manage",
    "receivables:approve", "payables:approve",
    "customer_wallet:approve", "gift_vouchers:approve",
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
                "label":        f"{module.replace('_', ' ').title()} — {action.replace('_', ' ').title()}",
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


# ── Common permission bundles ─────────────────────────────────────────────────

_SALES_FULL       = _perm("dashboard:view", "analytics:view", "pos:manage", "cashier:manage",
                           "sales:manage", "sales_returns:manage", "customers:manage",
                           "customer_wallet:manage", "customer_loyalty:manage",
                           "customer_referrals:manage", "reports:view", "reports:export")

_INVENTORY_FULL   = _perm("inventory:manage", "medicines:manage", "medicine_categories:manage",
                           "medicine_brands:manage", "medicine_manufacturers:manage",
                           "medicine_generics:manage", "medicine_units:manage",
                           "medicine_strengths:manage", "medicine_dosage_forms:manage",
                           "medicine_routes:manage", "medicine_interactions:manage",
                           "medicine_batches:manage", "warehouses:manage", "rack_management:manage",
                           "stock_transfers:manage", "stock_reservations:manage",
                           "physical_audit:manage", "inventory_adjustments:manage")

_PURCHASE_FULL    = _perm("purchase:manage", "purchase_requests:manage",
                           "purchase_quotations:manage", "purchase_orders:manage",
                           "goods_receiving:manage", "purchase_returns:manage",
                           "suppliers:manage", "supplier_payments:manage", "supplier_ledger:view")

_ACCOUNTING_FULL  = _perm("accounting:manage", "chart_of_accounts:manage",
                           "journal_entries:manage", "general_ledger:view",
                           "cash_book:manage", "bank_book:manage",
                           "receivables:manage", "payables:manage",
                           "expenses:manage", "fixed_assets:manage",
                           "profit_loss:view", "balance_sheet:view", "trial_balance:view",
                           "tax_management:manage")

_HR_FULL          = _perm("hr:manage", "employees:manage", "attendance:manage", "leaves:manage",
                           "payroll:manage", "payroll_setup:manage", "departments:manage",
                           "designations:manage", "shifts:manage", "training:manage",
                           "performance_reviews:manage", "employee_tasks:manage",
                           "employee_documents:manage", "org_chart:view")

_CRM_FULL         = _perm("crm:manage", "marketing:manage", "campaigns:manage",
                           "coupons:manage", "gift_vouchers:manage",
                           "customers:manage", "customer_loyalty:manage", "customer_referrals:manage")

_REPORTS_FULL     = _perm("reports:manage", "bi_reports:manage", "report_builder:manage", "analytics:view")

_AUDIT_READ       = _perm("audit:view", "audit:export", "audit:investigate", "audit:risk", "audit:compliance")

_AUDIT_FULL       = _perm("audit:manage", "audit:view", "audit:export", "audit:investigate",
                           "audit:risk", "audit:compliance", "audit:delete_logs",
                           "audit:restore_logs", "audit:system",
                           "compliance:manage", "system_logs:view", "system_logs:export")

_BRANCHES_MANAGE  = _perm("branches:manage", "branch_settings:manage")
_USERS_MANAGE     = _perm("users:manage", "roles:manage", "permissions:view")
_SETTINGS_FULL    = _perm("settings:view", "settings:company", "settings:invoice",
                           "settings:tax", "settings:crm", "settings:inventory",
                           "settings:hr", "settings:pos")
_NOTIFICATIONS    = _perm("notifications:view", "notifications:manage")
_PRESCRIPTIONS    = _perm("prescriptions:manage", "doctors:view", "medicines:view", "customers:view")


# ── Default Enterprise Roles ──────────────────────────────────────────────────

DEFAULT_ROLES: Dict[str, Dict] = {
    "Super Admin": {
        "branch_scope": "global",
        "data_scope":   "global",
        "color":        "#dc2626",
        "icon":         "ShieldAlert",
        "sort_order":   1,
        "is_system_role": True,
        "permissions":  ["*"],
    },
    "Devjix Support": {
        "branch_scope": "global",
        "data_scope":   "global",
        "color":        "#1e3a8a",
        "icon":         "LifeBuoy",
        "sort_order":   2,
        "is_system_role": True,
        "permissions":  ["*"],
    },
    "Pharmacy Owner": {
        "branch_scope": "global",
        "data_scope":   "tenant",
        "color":        "#f59e0b",
        "icon":         "Crown",
        "sort_order":   3,
        "is_system_role": False,
        "permissions":  _merge(
            _SALES_FULL, _INVENTORY_FULL, _PURCHASE_FULL,
            _ACCOUNTING_FULL, _HR_FULL, _CRM_FULL, _REPORTS_FULL,
            _AUDIT_READ, _BRANCHES_MANAGE, _USERS_MANAGE, _SETTINGS_FULL, _NOTIFICATIONS,
            _perm("prescriptions:manage", "doctors:manage",
                  "compliance:manage", "ocr_queue:manage",
                  "system_health:view", "backups:view",
                  "system_logs:view", "notifications:manage",
                  "executive_dashboard:view"),
        ),
    },
    "Branch Owner": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#6366f1",
        "icon":         "Building",
        "sort_order":   4,
        "is_system_role": False,
        "permissions":  _merge(
            _SALES_FULL, _INVENTORY_FULL, _PURCHASE_FULL,
            _ACCOUNTING_FULL, _HR_FULL, _CRM_FULL, _REPORTS_FULL,
            _AUDIT_READ, _SETTINGS_FULL, _NOTIFICATIONS,
            _perm("prescriptions:manage", "doctors:manage",
                  "compliance:manage", "ocr_queue:manage",
                  "system_health:view", "backups:view",
                  "system_logs:view", "notifications:manage"),
        ),
    },
    "Branch Manager": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#4f46e5",
        "icon":         "Building2",
        "sort_order":   5,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view", "analytics:view",
            "pos:manage", "cashier:manage", "sales:manage", "sales_returns:manage",
            "customers:manage", "customer_loyalty:manage",
            "inventory:manage", "medicines:manage", "medicine_batches:manage",
            "stock_transfers:view", "stock_transfers:create",
            "physical_audit:manage", "inventory_adjustments:view",
            "purchase:view", "purchase_requests:create", "purchase_orders:view", "goods_receiving:view",
            "expenses:view", "expenses:create",
            "reports:manage", "bi_reports:view",
            "attendance:manage", "leaves:manage", "hr:view", "employees:view",
            "branches:view", "branch_settings:view",
            "notifications:view", "audit:view", "prescriptions:view",
        ),
    },
    "Senior Pharmacist": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#059669",
        "icon":         "Stethoscope",
        "sort_order":   6,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "pos:manage", "cashier:manage", "sales:manage", "sales_returns:manage",
            "inventory:manage", "medicines:manage",
            "medicine_categories:view", "medicine_brands:view",
            "medicine_batches:manage",
            "stock_transfers:view", "stock_reservations:view",
            "inventory_adjustments:create",
            "prescriptions:manage", "doctors:view",
            "customers:view", "customer_loyalty:view",
            "reports:view", "reports:export",
        ),
    },
    "Pharmacist & Cashier": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#10b981",
        "icon":         "Wallet",
        "sort_order":   7,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "pos:view", "pos:create", "cashier:view", "cashier:manage",
            "sales:view", "sales:create",
            "inventory:view", "medicines:view",
            "medicine_categories:view", "medicine_brands:view", "medicine_batches:view",
            "prescriptions:manage", "doctors:view",
            "customers:view",
        ),
    },
    "Inventory Manager & Store Keeper": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#f97316",
        "icon":         "Package",
        "sort_order":   8,
        "is_system_role": False,
        "permissions":  _merge(
            _INVENTORY_FULL,
            _perm("dashboard:view", "analytics:view",
                  "purchase:view", "goods_receiving:manage",
                  "suppliers:view", "reports:view", "reports:export",
                  "ocr_queue:manage"),
        ),
    },
    "Accountant": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#22c55e",
        "icon":         "DollarSign",
        "sort_order":   9,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "accounting:view", "accounting:create",
            "chart_of_accounts:view",
            "journal_entries:manage", "general_ledger:view", "general_ledger:export",
            "cash_book:manage", "bank_book:manage",
            "receivables:manage", "payables:manage",
            "expenses:manage",
            "profit_loss:view", "balance_sheet:view", "trial_balance:view",
            "tax_management:view",
            "reports:view", "reports:export",
            "supplier_payments:view", "supplier_ledger:view",
        ),
    },
    "Auditor": {
        "branch_scope": "assigned_branch",
        "data_scope":   "branch",
        "color":        "#64748b",
        "icon":         "Search",
        "sort_order":   10,
        "is_system_role": False,
        "permissions":  _perm(
            "dashboard:view",
            "audit:view", "audit:export", "audit:investigate",
            "audit:risk", "audit:compliance",
            "sales:view", "purchase:view", "inventory:view", "accounting:view",
            "general_ledger:view", "journal_entries:view",
            "expenses:view", "payroll:view",
            "hr:view", "employees:view", "system_logs:view",
            "reports:view", "reports:export", "compliance:view",
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

            # Get existing permission links for this role
            existing_rp_perm_ids: Set[str] = {
                row[0]
                for row in db.query(EnterpriseRolePermission.permission_id)
                .filter(EnterpriseRolePermission.role_id == role.id)
                .all()
            }

            # Determine which codes to assign
            codes_to_add = list(all_perms.keys()) if "*" in perm_codes else perm_codes

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

