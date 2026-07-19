"""
backend/scripts/reset_rbac_seed.py
────────────────────────────────────────────────────────────────────────────────
NEPMS RBAC 4.0 — Wipe & Reseed Script  (v2 — Strict SaaS/Tenant Split)

PERMISSION MODEL
────────────────
Two strictly separated permission domains:

  SAAS_PERMISSIONS   → Platform-level codes (tenant:*, subscription:*, system:*)
                       ONLY assigned to L1 Super Admin.

  TENANT_PERMISSIONS → All operational codes (accounting, hr, pos, inventory …)
                       Assigned to L2, L3 (and implicitly to L1 who gets BOTH).

HIERARCHY RULES
───────────────
  L1  Super Admin     saas_only  — SAAS_PERMISSIONS + TENANT_PERMISSIONS
  L2  Pharmacy Owner  tenant     — TENANT_PERMISSIONS only (JWT carries "*")
  L3  Branch Owner    branch     — TENANT_PERMISSIONS only (scope via data_scope)
  L4  Branch Staff    branch     — Granular POS/Sales subset

WHAT IT DOES
────────────
1. Soft-deletes all existing EnterpriseRole rows (is_deleted=True)
2. Hard-deletes all EnterpriseRolePermission and EnterprisePermission rows
3. Re-seeds EnterprisePermission rows for all modules
4. Re-seeds 4 canonical roles with correct scopes and permission lists
5. Re-links existing EnterpriseUser records to new roles by name/level match

USAGE
─────
  cd backend
  python scripts/reset_rbac_seed.py --dry-run           # Preview
  python scripts/reset_rbac_seed.py                     # All pharmacies
  python scripts/reset_rbac_seed.py --pharmacy-id <id>  # One tenant

SAFETY
──────
• Does NOT touch users / sessions / login history
• Idempotent — safe to run multiple times
"""

import sys
import os
import argparse
from typing import Dict, List, Optional, Set

# ── Add backend to path ────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.enterprise.user import (
    EnterpriseRole,
    EnterprisePermission,
    EnterpriseRolePermission,
    EnterpriseUser,
)
from models.users import Pharmacy, Tenant


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 1 — SAAS MODULES  (L1 Super Admin only)
# These represent platform / infrastructure operations that have nothing to do
# with a pharmacy's day-to-day business data.
# ══════════════════════════════════════════════════════════════════════════════

_SAAS_MODULES: List[tuple] = [
    # SaaS Platform Tenancy
    ("tenant",              ["view", "create", "update", "delete", "manage",
                             "suspend", "activate", "impersonate"]),
    ("subscription",        ["view", "create", "update", "manage",
                             "upgrade", "downgrade", "cancel"]),
    ("billing",             ["view", "manage", "invoice", "refund"]),
    ("saas_settings",       ["view", "manage", "system"]),
    ("feature_flags",       ["view", "create", "update", "manage"]),
    ("system_health",       ["view", "manage"]),
    ("system_logs",         ["view", "export", "manage"]),
    ("backups",             ["view", "create", "restore", "manage"]),
    ("superadmin_audit",    ["view", "export", "manage"]),
    # Platform system module — catch-all for SaaS ops
    ("system",              ["view", "license", "subscription", "billing",
                             "updates", "monitoring", "impersonate"]),
]

_SAAS_SENSITIVE_CODES: Set[str] = {
    "tenant:delete", "tenant:suspend", "tenant:impersonate",
    "subscription:cancel", "subscription:downgrade",
    "billing:refund", "saas_settings:system",
    "system:impersonate", "system:license",
    "backups:restore", "backups:manage",
    "system_logs:manage", "superadmin_audit:manage",
}


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 2 — TENANT / OPERATIONAL MODULES  (L2, L3, L4)
# These map to actual pharmacy business features. L1 also gets these but only
# for support/impersonation purposes — their data_scope=saas_only prevents
# them from actually seeing any pharmacy data in the UI.
# ══════════════════════════════════════════════════════════════════════════════

_TENANT_MODULES: List[tuple] = [
    # ── Dashboard & Analytics ──────────────────────────────────────────────────
    ("dashboard",              ["view", "export"]),
    ("analytics",              ["view", "export"]),
    ("executive_dashboard",    ["view", "export"]),

    # ── Point of Sale ─────────────────────────────────────────────────────────
    ("pos",                    ["view", "create", "update", "manage",
                                "approve", "void", "print"]),
    ("cashier",                ["view", "create", "manage", "print"]),

    # ── Sales ─────────────────────────────────────────────────────────────────
    ("sales",                  ["view", "create", "update", "manage",
                                "approve", "void", "export", "print"]),
    ("sales_returns",          ["view", "create", "approve", "manage",
                                "export", "print"]),

    # ── CRM & Customers ───────────────────────────────────────────────────────
    ("customers",              ["view", "create", "update", "delete",
                                "manage", "export", "print"]),
    ("customer_wallet",        ["view", "create", "update", "manage", "approve"]),
    ("customer_loyalty",       ["view", "create", "update", "manage", "export"]),
    ("customer_referrals",     ["view", "create", "manage", "export"]),
    ("crm",                    ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("marketing",              ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("campaigns",              ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("coupons",                ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("gift_vouchers",          ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),

    # ── Pharmacy / Clinical ───────────────────────────────────────────────────
    ("prescriptions",          ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("doctors",                ["view", "create", "update", "delete",
                                "manage", "export"]),

    # ── Inventory ─────────────────────────────────────────────────────────────
    ("inventory",              ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("medicines",              ["view", "create", "update", "delete",
                                "manage", "export", "print"]),
    ("medicine_categories",    ["view", "create", "update", "delete", "manage"]),
    ("medicine_brands",        ["view", "create", "update", "delete", "manage"]),
    ("medicine_manufacturers", ["view", "create", "update", "delete", "manage"]),
    ("medicine_generics",      ["view", "create", "update", "delete", "manage"]),
    ("medicine_units",         ["view", "create", "update", "delete", "manage"]),
    ("medicine_strengths",     ["view", "create", "update", "delete", "manage"]),
    ("medicine_dosage_forms",  ["view", "create", "update", "delete", "manage"]),
    ("medicine_routes",        ["view", "create", "update", "delete", "manage"]),
    ("medicine_interactions",  ["view", "create", "update", "delete", "manage"]),
    ("medicine_batches",       ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("warehouses",             ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("rack_management",        ["view", "create", "update", "delete", "manage"]),
    ("stock_transfers",        ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("stock_reservations",     ["view", "create", "update", "delete",
                                "manage", "approve"]),
    ("physical_audit",         ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("inventory_adjustments",  ["view", "create", "approve", "manage",
                                "export", "print"]),
    ("ocr_queue",              ["view", "create", "update", "manage"]),

    # ── Purchase / Procurement ────────────────────────────────────────────────
    ("purchase",               ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("purchase_requests",      ["view", "create", "update", "delete",
                                "manage", "approve", "export"]),
    ("purchase_quotations",    ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("purchase_orders",        ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("goods_receiving",        ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("purchase_returns",       ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("suppliers",              ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("supplier_payments",      ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("supplier_ledger",        ["view", "export", "print"]),

    # ── Accounting & Finance ──────────────────────────────────────────────────
    ("accounting",             ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("chart_of_accounts",      ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("journal_entries",        ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("general_ledger",         ["view", "export", "print"]),
    ("cash_book",              ["view", "create", "update", "manage",
                                "export", "print"]),
    ("bank_book",              ["view", "create", "update", "manage",
                                "export", "print"]),
    ("receivables",            ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("payables",               ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("expenses",               ["view", "create", "update", "delete",
                                "manage", "approve", "export", "print"]),
    ("fixed_assets",           ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("profit_loss",            ["view", "export", "print"]),
    ("balance_sheet",          ["view", "export", "print"]),
    ("trial_balance",          ["view", "export", "print"]),
    ("tax_management",         ["view", "create", "update", "delete",
                                "manage", "export"]),

    # ── HR & Payroll ──────────────────────────────────────────────────────────
    ("hr",                     ["view", "create", "update", "manage", "export"]),
    ("employees",              ["view", "create", "update", "delete",
                                "manage", "export", "print"]),
    ("attendance",             ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("leaves",                 ["view", "create", "update", "manage",
                                "approve", "export"]),
    ("payroll",                ["view", "create", "update", "manage",
                                "approve", "export", "print"]),
    ("payroll_setup",          ["view", "create", "update", "manage"]),
    ("departments",            ["view", "create", "update", "delete", "manage"]),
    ("designations",           ["view", "create", "update", "delete", "manage"]),
    ("shifts",                 ["view", "create", "update", "delete", "manage"]),
    ("training",               ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("performance_reviews",    ["view", "create", "update", "manage",
                                "approve", "export"]),
    ("employee_tasks",         ["view", "create", "update", "delete", "manage"]),
    ("employee_documents",     ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("org_chart",              ["view", "export"]),

    # ── Organization / Branches ───────────────────────────────────────────────
    # Note: creating NEW branches is blocked at API level (L1 only).
    # L2/L3 can view and edit branches they have access to.
    ("branches",               ["view", "create", "update", "delete",
                                "manage", "export"]),
    ("branch_settings",        ["view", "update", "manage"]),

    # ── Reports & BI ──────────────────────────────────────────────────────────
    ("reports",                ["view", "create", "manage", "export", "print"]),
    ("bi_reports",             ["view", "create", "manage", "export"]),
    ("report_builder",         ["view", "create", "update", "delete",
                                "manage", "export"]),

    # ── Compliance & Audit (Tenant-facing) ───────────────────────────────────
    ("compliance",             ["view", "create", "update", "manage",
                                "approve", "export"]),
    ("audit",                  ["view", "export", "manage", "investigate",
                                "risk", "compliance",
                                "delete_logs", "restore_logs", "system"]),

    # ── Access Control (Tenant) ───────────────────────────────────────────────
    ("users",                  ["view", "create", "update", "delete", "manage",
                                "suspend", "unlock", "reset_password",
                                "assign_role", "assign_branch", "export"]),
    ("roles",                  ["view", "create", "update", "delete", "manage"]),
    ("permissions",            ["view", "manage"]),

    # ── Settings (Tenant-facing) ──────────────────────────────────────────────
    ("settings",               ["view", "company", "invoice", "tax", "crm",
                                "inventory", "hr", "pos",
                                "security", "api", "modules"]),

    # ── Notifications ─────────────────────────────────────────────────────────
    ("notifications",          ["view", "create", "update", "manage"]),
]

_TENANT_SENSITIVE_CODES: Set[str] = {
    "pos:void", "sales:void", "sales_returns:approve",
    "inventory:delete", "inventory_adjustments:approve",
    "inventory_adjustments:create", "stock_transfers:approve",
    "physical_audit:approve", "supplier_payments:approve",
    "journal_entries:approve", "expenses:approve",
    "payroll:approve", "payroll:manage",
    "audit:delete_logs", "audit:restore_logs",
    "audit:manage", "audit:system",
    "users:delete", "users:suspend", "users:unlock",
    "users:reset_password", "users:assign_role", "users:assign_branch",
    "settings:security", "settings:api", "settings:modules",
    "roles:delete", "permissions:manage",
    "purchase_orders:approve", "goods_receiving:approve",
    "purchase_returns:approve", "cash_book:manage", "bank_book:manage",
    "receivables:approve", "payables:approve",
    "customer_wallet:approve", "gift_vouchers:approve",
}

# Combined sensitive codes (for the is_sensitive flag on permissions)
_ALL_SENSITIVE_CODES: Set[str] = _SAAS_SENSITIVE_CODES | _TENANT_SENSITIVE_CODES


# ══════════════════════════════════════════════════════════════════════════════
# PERMISSION CODE LISTS
# ══════════════════════════════════════════════════════════════════════════════

def _saas_permission_codes() -> List[str]:
    """All SaaS/platform-level permission codes. L1 ONLY."""
    return [
        f"{module}:{action}"
        for module, actions in _SAAS_MODULES
        for action in actions
    ]


def _tenant_permission_codes() -> List[str]:
    """All tenant/operational permission codes. L2, L3, (and L1 who gets both)."""
    return [
        f"{module}:{action}"
        for module, actions in _TENANT_MODULES
        for action in actions
    ]


# ══════════════════════════════════════════════════════════════════════════════
# PERMISSION SEED BUILDER
# ══════════════════════════════════════════════════════════════════════════════

def _build_permission_seed() -> List[Dict]:
    """
    Build the flat list of all permissions to insert into EnterprisePermission.
    Includes BOTH SaaS and Tenant permissions so the full catalog is stored.
    The seeder prints a clear tag (SAAS vs TENANT) so DevOps can audit.
    """
    result = []

    for domain, modules in [("SAAS", _SAAS_MODULES), ("TENANT", _TENANT_MODULES)]:
        for module, actions in modules:
            for action in actions:
                code = f"{module}:{action}"
                result.append({
                    "module":       module,
                    "action":       action,
                    "code":         code,
                    "label":        (
                        f"{module.replace('_', ' ').title()} — "
                        f"{action.replace('_', ' ').title()}"
                    ),
                    "description":  f"[{domain}] {module}:{action}",
                    "is_sensitive": code in _ALL_SENSITIVE_CODES,
                })
    return result


# ══════════════════════════════════════════════════════════════════════════════
# CANONICAL ROLE DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

# Build permission lists eagerly (module lists are top-level constants so
# the comprehensions below run at import time — no lazy evaluation issues).
_SAAS_CODES   = _saas_permission_codes()
_TENANT_CODES = _tenant_permission_codes()

CANONICAL_ROLES: List[Dict] = [
    # ─────────────────────────────────────────────────────────────────────────
    # L1 — Super Admin
    # Gets: SAAS_PERMISSIONS + TENANT_PERMISSIONS
    # Why TENANT too? Support engineers need to impersonate tenants. The actual
    # data isolation is enforced by data_scope=saas_only at the query layer,
    # not by removing permission codes.
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name":              "Super Admin",
        "hierarchy_level":   1,
        "branch_scope":      "global",
        "data_scope":        "saas_only",
        "color":             "#dc2626",
        "icon":              "ShieldAlert",
        "sort_order":        1,
        "is_system_default": True,
        "is_system_role":    True,
        "description":       (
            "Platform-level SaaS administrator. "
            "Has both SaaS management and tenant operational permissions. "
            "Cannot view actual pharmacy business data (data_scope=saas_only)."
        ),
        # L1 gets BOTH domains
        "permission_codes":  list(dict.fromkeys(_SAAS_CODES + _TENANT_CODES)),
    },

    # ─────────────────────────────────────────────────────────────────────────
    # L2 — Pharmacy Owner
    # Gets: TENANT_PERMISSIONS only
    # NEVER gets: tenant:create, subscription:manage, system:*, etc.
    # JWT carries ["*"] wildcard for performance; DB stores explicit codes
    # for the permission matrix UI.
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name":              "Pharmacy Owner",
        "hierarchy_level":   2,
        "branch_scope":      "all_branches",
        "data_scope":        "tenant",
        "color":             "#f59e0b",
        "icon":              "Crown",
        "sort_order":        2,
        "is_system_default": True,
        "is_system_role":    False,
        "description":       (
            "Full operational access to all branches within their pharmacy. "
            "Cannot create new branches or access SaaS management features."
        ),
        # L2 gets ONLY tenant operational codes — zero SaaS codes
        "permission_codes":  _TENANT_CODES,
    },

    # ─────────────────────────────────────────────────────────────────────────
    # L3 — Branch Owner
    # Gets: EXACT SAME TENANT_PERMISSIONS as L2
    # Isolation is handled by data_scope=branch in the JWT, NOT by removing
    # permissions. Removing permissions would break the inheritance model.
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name":              "Branch Owner",
        "hierarchy_level":   3,
        "branch_scope":      "assigned_branch",
        "data_scope":        "branch",
        "color":             "#6366f1",
        "icon":              "Building",
        "sort_order":        3,
        "is_system_default": True,
        "is_system_role":    False,
        "description":       (
            "Franchise/branch owner. Identical operational permissions to "
            "Pharmacy Owner but strictly isolated to their own branch "
            "(enforced via data_scope=branch at query time)."
        ),
        # L3 gets SAME codes as L2 — data_scope handles the isolation
        "permission_codes":  _TENANT_CODES,
    },

    # ─────────────────────────────────────────────────────────────────────────
    # L4 — Branch Staff (default)
    # Gets: Minimal POS/Sales/Cashier permissions
    # L2/L3 admins extend this via the permission matrix UI.
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name":              "Branch Staff",
        "hierarchy_level":   4,
        "branch_scope":      "assigned_branch",
        "data_scope":        "branch",
        "color":             "#10b981",
        "icon":              "Users",
        "sort_order":        4,
        "is_system_default": True,
        "is_system_role":    False,
        "description":       (
            "Default staff role. Minimal POS/Sales/Cashier access. "
            "Extend via the role permission matrix as needed."
        ),
        "permission_codes": [
            # Dashboard
            "dashboard:view",
            # POS
            "pos:view", "pos:create", "pos:print",
            # Cashier
            "cashier:view", "cashier:create", "cashier:print",
            # Sales
            "sales:view", "sales:create", "sales:print",
            "sales_returns:view", "sales_returns:create",
            # Inventory (read only)
            "inventory:view",
            "medicines:view",
            "medicine_categories:view",
            "medicine_brands:view",
            "medicine_batches:view",
            # Customers
            "customers:view", "customers:create",
            # Prescriptions
            "prescriptions:view", "prescriptions:create",
            "doctors:view",
            # Notifications
            "notifications:view",
        ],
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# SEED FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_all_pharmacy_ids(db) -> List[str]:
    """Return all active pharmacy_ids to seed for each tenant."""
    pharmacies = db.query(Pharmacy).filter(
        Pharmacy.is_active == True,
        Pharmacy.is_deleted == False,
    ).all()
    ids = [p.id for p in pharmacies]
    if not ids:
        # Fallback: use tenant-based IDs if Pharmacy table is empty
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
        ids = [t.id for t in tenants]
    return ids


def wipe_existing_rbac(db, pharmacy_id: str, dry_run: bool = False) -> Dict:
    """
    Step 1: Soft-delete existing roles, hard-delete permission links & permissions.
    Returns counts of what was wiped.
    """
    stats = {}

    role_count = db.query(EnterpriseRole).filter(
        EnterpriseRole.pharmacy_id == pharmacy_id,
        EnterpriseRole.is_deleted == False,
    ).count()

    rp_count = (
        db.query(EnterpriseRolePermission)
        .join(EnterpriseRole, EnterpriseRolePermission.role_id == EnterpriseRole.id)
        .filter(EnterpriseRole.pharmacy_id == pharmacy_id)
        .count()
    )

    perm_count = db.query(EnterprisePermission).filter(
        EnterprisePermission.pharmacy_id == pharmacy_id
    ).count()

    stats["roles_to_wipe"]            = role_count
    stats["role_permissions_to_wipe"] = rp_count
    stats["permissions_to_wipe"]      = perm_count

    if not dry_run:
        # 1. Hard-delete all role-permission M2M links for this pharmacy
        role_ids = [
            r.id for r in db.query(EnterpriseRole.id).filter(
                EnterpriseRole.pharmacy_id == pharmacy_id
            ).all()
        ]
        if role_ids:
            db.query(EnterpriseRolePermission).filter(
                EnterpriseRolePermission.role_id.in_(role_ids)
            ).delete(synchronize_session=False)

        # 2. Soft-delete all roles (preserve for FK integrity)
        db.query(EnterpriseRole).filter(
            EnterpriseRole.pharmacy_id == pharmacy_id,
        ).update({"is_deleted": True}, synchronize_session=False)

        # 3. Hard-delete all permissions (will be fully re-seeded)
        db.query(EnterprisePermission).filter(
            EnterprisePermission.pharmacy_id == pharmacy_id,
        ).delete(synchronize_session=False)

        db.flush()

    return stats


def seed_permissions(db, pharmacy_id: str) -> List[EnterprisePermission]:
    """Step 2: Seed the full permission catalog for this pharmacy."""
    seed_data = _build_permission_seed()
    created = []
    for item in seed_data:
        perm = EnterprisePermission(pharmacy_id=pharmacy_id, **item)
        db.add(perm)
        created.append(perm)
    db.flush()
    return created


def seed_roles(
    db,
    pharmacy_id: str,
    all_perms: Dict[str, EnterprisePermission],
) -> List[EnterpriseRole]:
    """Step 3: Seed 4 canonical roles and link their permission sets."""
    created = []

    for config in CANONICAL_ROLES:
        role = EnterpriseRole(
            pharmacy_id      = pharmacy_id,
            name             = config["name"],
            description      = config["description"],
            hierarchy_level  = config["hierarchy_level"],
            branch_scope     = config["branch_scope"],
            data_scope       = config["data_scope"],
            color            = config["color"],
            icon             = config["icon"],
            sort_order       = config["sort_order"],
            is_system_default= config["is_system_default"],
            is_system_role   = config["is_system_role"],
        )
        db.add(role)
        db.flush()

        codes_to_link = config["permission_codes"]
        linked = 0
        missing = []
        for code in codes_to_link:
            perm = all_perms.get(code)
            if perm:
                db.add(EnterpriseRolePermission(role_id=role.id, permission_id=perm.id))
                linked += 1
            else:
                missing.append(code)

        created.append(role)
        print(
            f"  ✓ {role.name:<20} L{role.hierarchy_level}"
            f"  scope={role.data_scope:<12}"
            f"  linked={linked}/{len(codes_to_link)} permissions"
            + (f"  ⚠ missing: {missing[:3]}{'…' if len(missing) > 3 else ''}" if missing else "")
        )

    db.flush()
    return created


def relink_users(
    db,
    pharmacy_id: str,
    new_roles: List[EnterpriseRole],
    dry_run: bool = False,
) -> int:
    """
    Step 4: Re-link EnterpriseUser records to new roles.
    Strategy:
      1. Try exact role name match  → matched canonical role
      2. Fallback to hierarchy_level → mapped canonical role
      3. Default → Branch Staff
    """
    role_by_name: Dict[str, EnterpriseRole]  = {r.name: r for r in new_roles}
    level_to_role: Dict[int, EnterpriseRole] = {r.hierarchy_level: r for r in new_roles}
    default_role = role_by_name.get("Branch Staff")

    users = db.query(EnterpriseUser).filter(
        EnterpriseUser.pharmacy_id == pharmacy_id,
        EnterpriseUser.is_deleted  == False,
    ).all()

    relinked = 0
    for eu in users:
        old_role = eu.enterprise_role   # may be soft-deleted now

        if dry_run:
            relinked += 1
            continue

        target = None
        if old_role:
            # 1. Exact name match
            target = role_by_name.get(old_role.name)
            # 2. Hierarchy level fallback
            if not target:
                old_level = getattr(old_role, "hierarchy_level", 4)
                target = level_to_role.get(old_level)

        # 3. Ultimate fallback
        if not target:
            target = default_role

        if target:
            eu.enterprise_role_id = target.id
            relinked += 1

    db.flush()
    return relinked


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def run(pharmacy_id: Optional[str] = None, dry_run: bool = False):
    db = SessionLocal()
    try:
        if pharmacy_id:
            pharmacy_ids = [pharmacy_id]
        else:
            pharmacy_ids = get_all_pharmacy_ids(db)

        if not pharmacy_ids:
            print("❌ No pharmacies found. Use --pharmacy-id or seed pharmacies first.")
            return

        # Print permission summary for auditing
        saas_count   = len(_SAAS_CODES)
        tenant_count = len(_TENANT_CODES)
        l1_total     = len(CANONICAL_ROLES[0]["permission_codes"])

        print(f"\n{'[DRY RUN] ' if dry_run else ''}NEPMS RBAC 4.0 Reseed  (v2 — Strict SaaS/Tenant Split)")
        print(f"{'─' * 60}")
        print(f"  Permission catalog:")
        print(f"    SaaS   (L1 only):         {saas_count:>4} codes")
        print(f"    Tenant (L2, L3, L4):      {tenant_count:>4} codes")
        print(f"    L1 total  (SAAS+TENANT):  {l1_total:>4} codes")
        print(f"    L2/L3 total (TENANT):     {tenant_count:>4} codes")
        print(f"  Targeting {len(pharmacy_ids)} pharmacy/tenant(s)\n")

        for pid in pharmacy_ids:
            print(f"━━━ Pharmacy ID: {pid} ━━━")

            # Step 1: Wipe
            print("  Step 1: Wiping existing RBAC data...")
            stats = wipe_existing_rbac(db, pid, dry_run=dry_run)
            print(f"    → Roles soft-deleted:          {stats['roles_to_wipe']}")
            print(f"    → Role-permission links wiped: {stats['role_permissions_to_wipe']}")
            print(f"    → Permissions hard-deleted:    {stats['permissions_to_wipe']}")

            if dry_run:
                print("  [DRY RUN] Skipping seeding.")
                continue

            # Step 2: Seed permissions
            print("  Step 2: Seeding permission catalog...")
            perms = seed_permissions(db, pid)
            all_perms_map: Dict[str, EnterprisePermission] = {p.code: p for p in perms}
            print(f"    → {len(perms)} permissions seeded "
                  f"({saas_count} SaaS + {tenant_count} Tenant)")

            # Step 3: Seed roles
            print("  Step 3: Seeding canonical roles...")
            new_roles = seed_roles(db, pid, all_perms_map)
            print(f"    → {len(new_roles)} roles created")

            # Step 4: Re-link users
            print("  Step 4: Re-linking users to new roles...")
            relinked = relink_users(db, pid, new_roles, dry_run=dry_run)
            print(f"    → {relinked} users re-linked")

            print()

        if not dry_run:
            db.commit()
            print("✅ RBAC reseed committed successfully.")
            print("\n⚠  IMPORTANT: All active JWTs are now stale.")
            print("   Ask all users to log out and log back in.\n")
            print("NEXT STEPS:")
            print("  1. Verify L2 users can see Accounting, HR, POS modules.")
            print("  2. Verify L2 users CANNOT see tenant:create or system:* routes.")
            print("  3. Run specialty role seeder for Pharmacist, Accountant, etc.:")
            print("     POST /api/v1/enterprise/roles/seed-enterprise")
        else:
            db.rollback()
            print("✅ Dry run complete — no changes written.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during reseed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="NEPMS RBAC 4.0 — Wipe & Reseed (v2 Strict SaaS/Tenant Split)"
    )
    parser.add_argument(
        "--pharmacy-id",
        help="Target a specific pharmacy ID (omit for all active pharmacies)",
        default=None,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be changed without writing anything",
    )
    args = parser.parse_args()

    run(pharmacy_id=args.pharmacy_id, dry_run=args.dry_run)
