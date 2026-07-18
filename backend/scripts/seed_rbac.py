"""
scripts/seed_rbac.py
──────────────────────────────────────────────────────────────────────────────
Phase 6 — Enterprise RBAC Unification
Module-wise permission definitions + system role seeding.

This script is IDEMPOTENT — safe to run multiple times.
Run via: python scripts/seed_rbac.py

Hierarchy:
    Level 1 — Super Admin      (SaaS only, no pharmacy data)
    Level 2 — Pharmacy Owner   (wildcard "*" within tenant)
    Level 3 — Branch Owner     (own branch, broad permissions)
    Level 4 — Branch Staff     (explicit permissions only)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.enterprise.user import (
    EnterpriseRole,
    EnterprisePermission,
    EnterpriseRolePermission,
)

# ─────────────────────────────────────────────────────────────────────────────
# MODULE-WISE PERMISSION DEFINITIONS
# Format: ("module:action", "Human-Readable Label", "module")
# ─────────────────────────────────────────────────────────────────────────────

ALL_PERMISSIONS = [
    # ── Sales ──────────────────────────────────────────────────────────────
    ("sales:view",       "View Sales",          "sales"),
    ("sales:create",     "Create Sale",         "sales"),
    ("sales:edit",       "Edit Sale",           "sales"),
    ("sales:void",       "Void Sale",           "sales"),
    ("sales:return",     "Process Return",      "sales"),
    ("sales:refund",     "Process Refund",      "sales"),
    ("sales:discount",   "Apply Discount",      "sales"),
    ("sales:hold",       "Hold Sale",           "sales"),
    ("sales:print",      "Print Receipt",       "sales"),
    ("sales:export",     "Export Sales",        "sales"),

    # ── POS ────────────────────────────────────────────────────────────────
    ("pos:view",         "View POS",            "pos"),
    ("pos:create",       "Create POS Transaction",  "pos"),
    ("pos:hold",         "Hold POS",            "pos"),
    ("pos:return",       "POS Return",          "pos"),
    ("pos:discount",     "POS Discount",        "pos"),
    ("pos:cash_in",      "Cash In",             "pos"),
    ("pos:cash_out",     "Cash Out",            "pos"),
    ("pos:close_day",    "Close Day",           "pos"),

    # ── Inventory ──────────────────────────────────────────────────────────
    ("inventory:view",       "View Inventory",      "inventory"),
    ("inventory:create",     "Add Medicine",        "inventory"),
    ("inventory:edit",       "Edit Medicine",       "inventory"),
    ("inventory:delete",     "Delete Medicine",     "inventory"),
    ("inventory:adjust",     "Stock Adjustment",    "inventory"),
    ("inventory:transfer",   "Stock Transfer",      "inventory"),
    ("inventory:batch",      "Manage Batches",      "inventory"),
    ("inventory:import",     "Import Inventory",    "inventory"),
    ("inventory:export",     "Export Inventory",    "inventory"),
    ("inventory:cycle_count","Cycle Count",         "inventory"),
    ("inventory:reservation","Reserve Stock",       "inventory"),

    # ── Purchase ───────────────────────────────────────────────────────────
    ("purchase:view",        "View Purchases",      "purchase"),
    ("purchase:create",      "Create Purchase",     "purchase"),
    ("purchase:edit",        "Edit Purchase",       "purchase"),
    ("purchase:delete",      "Delete Draft Purchase","purchase"),
    ("purchase:approve",     "Approve Purchase",    "purchase"),
    ("purchase:receive",     "Receive Purchase",    "purchase"),
    ("purchase:return",      "Purchase Return",     "purchase"),
    ("purchase:quotation",   "Purchase Quotation",  "purchase"),
    ("purchase:export",      "Export Purchases",    "purchase"),

    # ── Customers ──────────────────────────────────────────────────────────
    ("customers:view",       "View Customers",      "customers"),
    ("customers:create",     "Add Customer",        "customers"),
    ("customers:edit",       "Edit Customer",       "customers"),
    ("customers:delete",     "Delete Customer",     "customers"),
    ("customers:export",     "Export Customers",    "customers"),
    ("customers:import",     "Import Customers",    "customers"),
    ("customers:credit",     "Manage Credit",       "customers"),

    # ── Suppliers ──────────────────────────────────────────────────────────
    ("suppliers:view",       "View Suppliers",      "suppliers"),
    ("suppliers:create",     "Add Supplier",        "suppliers"),
    ("suppliers:edit",       "Edit Supplier",       "suppliers"),
    ("suppliers:delete",     "Delete Supplier",     "suppliers"),
    ("suppliers:export",     "Export Suppliers",    "suppliers"),

    # ── Users ──────────────────────────────────────────────────────────────
    ("users:view",           "View Users",          "users"),
    ("users:create",         "Create User",         "users"),
    ("users:edit",           "Edit User",           "users"),
    ("users:suspend",        "Suspend User",        "users"),
    ("users:activate",       "Activate User",       "users"),
    ("users:delete",         "Delete User",         "users"),
    ("users:reset_password", "Reset Password",      "users"),
    ("users:assign_role",    "Assign Role",         "users"),

    # ── Roles ──────────────────────────────────────────────────────────────
    ("roles:view",           "View Roles",          "roles"),
    ("roles:create",         "Create Role",         "roles"),
    ("roles:edit",           "Edit Role",           "roles"),
    ("roles:delete",         "Delete Role",         "roles"),
    ("roles:assign",         "Assign Role to User", "roles"),

    # ── Branches ───────────────────────────────────────────────────────────
    ("branches:view",        "View Branches",       "branches"),
    ("branches:create",      "Create Branch",       "branches"),
    ("branches:edit",        "Edit Branch",         "branches"),
    ("branches:suspend",     "Suspend Branch",      "branches"),
    ("branches:activate",    "Activate Branch",     "branches"),
    ("branches:delete",      "Delete Branch",       "branches"),
    ("branches:compare",     "Compare Branches",    "branches"),

    # ── Reports ────────────────────────────────────────────────────────────
    ("reports:view",         "View Reports",        "reports"),
    ("reports:export",       "Export Reports",      "reports"),
    ("reports:print",        "Print Reports",       "reports"),
    ("reports:sales",        "Sales Reports",       "reports"),
    ("reports:inventory",    "Inventory Reports",   "reports"),
    ("reports:purchase",     "Purchase Reports",    "reports"),
    ("reports:financial",    "Financial Reports",   "reports"),

    # ── Accounts ───────────────────────────────────────────────────────────
    ("accounts:view",             "View Accounts",        "accounts"),
    ("accounts:create",           "Create Voucher",       "accounts"),
    ("accounts:edit",             "Edit Voucher",         "accounts"),
    ("accounts:approve_voucher",  "Approve Voucher",      "accounts"),
    ("accounts:close_day",        "Close Day",            "accounts"),
    ("accounts:reverse_entry",    "Reverse Entry",        "accounts"),
    ("accounts:export",           "Export Accounts",      "accounts"),

    # ── Settings ───────────────────────────────────────────────────────────
    ("settings:view",        "View Settings",       "settings"),
    ("settings:edit",        "Edit Settings",       "settings"),
    ("settings:modules",     "Manage Modules",      "settings"),

    # ── Prescriptions ──────────────────────────────────────────────────────
    ("prescriptions:view",   "View Prescriptions",  "prescriptions"),
    ("prescriptions:create", "Create Prescription", "prescriptions"),
    ("prescriptions:edit",   "Edit Prescription",   "prescriptions"),
    ("prescriptions:delete", "Delete Prescription", "prescriptions"),

    # ── Expenses ───────────────────────────────────────────────────────────
    ("expenses:view",        "View Expenses",       "expenses"),
    ("expenses:create",      "Add Expense",         "expenses"),
    ("expenses:edit",        "Edit Expense",        "expenses"),
    ("expenses:delete",      "Delete Expense",      "expenses"),
    ("expenses:approve",     "Approve Expense",     "expenses"),

    # ── Backup ─────────────────────────────────────────────────────────────
    ("backup:view",          "View Backups",        "backup"),
    ("backup:create",        "Create Backup",       "backup"),
    ("backup:restore",       "Restore Backup",      "backup"),

    # ── Dashboard ──────────────────────────────────────────────────────────
    ("dashboard:view",       "View Dashboard",      "dashboard"),
    ("dashboard:analytics",  "View Analytics",      "dashboard"),

    # ── System (Level 1 — Super Admin SaaS only) ───────────────────────────
    ("system:license",       "Manage License",      "system"),
    ("system:subscription",  "Manage Subscription", "system"),
    ("system:billing",       "Manage Billing",      "system"),
    ("system:updates",       "System Updates",      "system"),
    ("system:monitoring",    "System Monitoring",   "system"),
    ("system:impersonate",   "Impersonate User",    "system"),
]

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM ROLE DEFINITIONS
# hierarchy_level: 1=SA 2=PharmacyOwner 3=BranchOwner 4=Staff
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_ROLES = [
    {
        "name":             "Super Admin",
        "description":      "SaaS platform administrator. No pharmacy data access.",
        "hierarchy_level":  1,
        "is_system_role":   True,
        "is_system_default": True,
        "is_global_role":   True,
        "branch_scope":     "saas_only",
        "data_scope":       "saas_only",
        "color":            "#ef4444",
        "icon":             "ShieldCheck",
        "permissions":      [
            "system:license", "system:subscription", "system:billing",
            "system:updates", "system:monitoring", "system:impersonate",
        ],
    },
    {
        "name":             "Pharmacy Owner",
        "description":      "Full access to the entire pharmacy tenant. All branches.",
        "hierarchy_level":  2,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "all_branches",
        "data_scope":       "tenant",
        "color":            "#8b5cf6",
        "icon":             "Building2",
        # Pharmacy Owner gets "*" — no explicit list needed. Seeded for reference.
        "permissions":      ["*"],
    },
    {
        "name":             "Branch Owner",
        "description":      "Full access to own branch. Cannot see other branches.",
        "hierarchy_level":  3,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "branch",
        "color":            "#0ea5e9",
        "icon":             "Store",
        "permissions":      [
            "sales:view","sales:create","sales:edit","sales:void","sales:return",
            "sales:refund","sales:discount","sales:hold","sales:print","sales:export",
            "pos:view","pos:create","pos:hold","pos:return","pos:discount",
            "pos:cash_in","pos:cash_out","pos:close_day",
            "inventory:view","inventory:create","inventory:edit","inventory:adjust",
            "inventory:transfer","inventory:batch","inventory:import","inventory:export",
            "purchase:view","purchase:create","purchase:edit","purchase:delete",
            "purchase:approve","purchase:receive","purchase:return","purchase:quotation",
            "customers:view","customers:create","customers:edit","customers:delete",
            "customers:export","customers:import","customers:credit",
            "suppliers:view","suppliers:create","suppliers:edit","suppliers:delete",
            "users:view","users:create","users:edit","users:suspend","users:activate",
            "users:delete","users:reset_password","users:assign_role",
            "roles:view","roles:create","roles:edit",
            "reports:view","reports:export","reports:print","reports:sales",
            "reports:inventory","reports:purchase",
            "accounts:view","accounts:create","accounts:edit","accounts:approve_voucher",
            "accounts:close_day","accounts:reverse_entry","accounts:export",
            "settings:view","settings:edit",
            "prescriptions:view","prescriptions:create","prescriptions:edit","prescriptions:delete",
            "expenses:view","expenses:create","expenses:edit","expenses:approve",
            "backup:view","backup:create",
            "dashboard:view","dashboard:analytics",
        ],
    },
    {
        "name":             "Manager",
        "description":      "Branch manager. Most operations except role management.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "branch",
        "color":            "#10b981",
        "icon":             "UserCog",
        "permissions":      [
            "sales:view","sales:create","sales:edit","sales:void","sales:return","sales:refund",
            "sales:discount","sales:hold","sales:print","sales:export",
            "pos:view","pos:create","pos:hold","pos:return","pos:discount","pos:cash_in","pos:cash_out","pos:close_day",
            "inventory:view","inventory:create","inventory:edit","inventory:adjust","inventory:transfer","inventory:batch",
            "purchase:view","purchase:create","purchase:edit","purchase:approve","purchase:receive","purchase:return",
            "customers:view","customers:create","customers:edit","customers:credit",
            "suppliers:view","suppliers:create","suppliers:edit",
            "users:view","users:edit","users:reset_password",
            "reports:view","reports:export","reports:print","reports:sales","reports:inventory","reports:purchase",
            "accounts:view","accounts:create","accounts:close_day",
            "settings:view",
            "prescriptions:view","prescriptions:create","prescriptions:edit",
            "expenses:view","expenses:create","expenses:edit","expenses:approve",
            "dashboard:view","dashboard:analytics",
        ],
    },
    {
        "name":             "Pharmacist",
        "description":      "Dispenses medicines. Manages inventory and prescriptions.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "branch",
        "color":            "#06b6d4",
        "icon":             "Pill",
        "permissions":      [
            "sales:view","sales:create","sales:print",
            "pos:view","pos:create","pos:hold","pos:return",
            "inventory:view","inventory:create","inventory:edit","inventory:adjust","inventory:batch",
            "purchase:view","purchase:receive",
            "customers:view","customers:create",
            "reports:view","reports:print",
            "prescriptions:view","prescriptions:create","prescriptions:edit",
            "dashboard:view",
        ],
    },
    {
        "name":             "Cashier",
        "description":      "Handles sales and POS only.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "own_records",
        "color":            "#f59e0b",
        "icon":             "CreditCard",
        "permissions":      [
            "sales:view","sales:create","sales:print","sales:hold","sales:discount",
            "pos:view","pos:create","pos:hold","pos:return","pos:discount",
            "pos:cash_in","pos:cash_out",
            "customers:view","customers:create",
        ],
    },
    {
        "name":             "Store Keeper",
        "description":      "Manages stock, inventory, and purchases.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "branch",
        "color":            "#84cc16",
        "icon":             "Package",
        "permissions":      [
            "inventory:view","inventory:create","inventory:edit","inventory:adjust",
            "inventory:transfer","inventory:batch","inventory:import","inventory:export","inventory:cycle_count",
            "purchase:view","purchase:create","purchase:edit","purchase:receive","purchase:return",
            "suppliers:view","suppliers:create","suppliers:edit",
            "reports:view","reports:inventory","reports:purchase",
        ],
    },
    {
        "name":             "Accountant",
        "description":      "Manages accounts and financial reports.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "branch",
        "color":            "#a78bfa",
        "icon":             "Calculator",
        "permissions":      [
            "accounts:view","accounts:create","accounts:edit","accounts:approve_voucher",
            "accounts:close_day","accounts:reverse_entry","accounts:export",
            "reports:view","reports:export","reports:financial","reports:sales","reports:purchase",
            "expenses:view","expenses:create","expenses:edit","expenses:approve",
            "dashboard:view",
        ],
    },
    {
        "name":             "Receptionist",
        "description":      "Customer-facing. Sales and customer management.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "own_records",
        "color":            "#f472b6",
        "icon":             "Headphones",
        "permissions":      [
            "sales:view","sales:create","sales:print","sales:hold",
            "pos:view","pos:create","pos:hold",
            "customers:view","customers:create","customers:edit",
            "prescriptions:view","prescriptions:create",
        ],
    },
    {
        "name":             "Delivery Rider",
        "description":      "Handles delivery orders only.",
        "hierarchy_level":  4,
        "is_system_role":   False,
        "is_system_default": True,
        "is_global_role":   False,
        "branch_scope":     "assigned_branch",
        "data_scope":       "own_records",
        "color":            "#fb923c",
        "icon":             "Truck",
        "permissions":      [
            "sales:view",
            "customers:view",
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# SEED FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def seed_permissions(db):
    """Upsert all permission codes. Returns a dict of {code: permission_obj}."""
    print("[seed_rbac] Seeding permissions...")
    perm_map = {}
    for code, label, module in ALL_PERMISSIONS:
        existing = db.query(EnterprisePermission).filter(
            EnterprisePermission.code == code
        ).first()
        action = code.split(":")[1] if ":" in code else code
        if existing:
            existing.label  = label
            existing.module = module
            existing.action = action
            perm_map[code]  = existing
        else:
            p = EnterprisePermission(code=code, label=label, module=module, action=action)
            db.add(p)
            db.flush()
            perm_map[code] = p
    print(f"[seed_rbac] {len(perm_map)} permissions upserted.")
    return perm_map


def seed_system_roles(db, tenant_id: str, perm_map: dict):
    """Upsert all system roles and their permissions for a tenant."""
    print(f"[seed_rbac] Seeding system roles for tenant {tenant_id}...")
    for role_def in SYSTEM_ROLES:
        existing = db.query(EnterpriseRole).filter(
            EnterpriseRole.name == role_def["name"],
            EnterpriseRole.tenant_id == tenant_id,
        ).first()

        if existing:
            role = existing
            # Update core fields
            role.description     = role_def["description"]
            role.hierarchy_level = role_def["hierarchy_level"]
            role.branch_scope    = role_def["branch_scope"]
            role.data_scope      = role_def["data_scope"]
            role.color           = role_def.get("color", "#6366f1")
            role.icon            = role_def.get("icon")
            role.is_system_role  = role_def["is_system_role"]
            role.is_system_default = role_def["is_system_default"]
            role.is_global_role  = role_def.get("is_global_role", False)
            print(f"  [update] {role.name} (L{role.hierarchy_level})")
        else:
            role = EnterpriseRole(
                name             = role_def["name"],
                description      = role_def["description"],
                tenant_id        = tenant_id,
                hierarchy_level  = role_def["hierarchy_level"],
                branch_scope     = role_def["branch_scope"],
                data_scope       = role_def["data_scope"],
                color            = role_def.get("color", "#6366f1"),
                icon             = role_def.get("icon"),
                is_system_role   = role_def["is_system_role"],
                is_system_default = role_def["is_system_default"],
                is_global_role   = role_def.get("is_global_role", False),
            )
            db.add(role)
            db.flush()
            print(f"  [create] {role.name} (L{role.hierarchy_level})")

        # Sync permissions (skip wildcard "*")
        # Clear old ones
        db.query(EnterpriseRolePermission).filter(
            EnterpriseRolePermission.role_id == role.id
        ).delete()

        for code in role_def.get("permissions", []):
            if code == "*":
                continue  # Pharmacy Owner: handled by hierarchy_level == 2 check
            perm = perm_map.get(code)
            if perm:
                db.add(EnterpriseRolePermission(role_id=role.id, permission_id=perm.id))

    db.commit()
    print(f"[seed_rbac] Done for tenant {tenant_id}.")


def seed_all_tenants():
    """Run for all active tenants."""
    db = SessionLocal()
    try:
        from models.users import Tenant
        tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
        perm_map = seed_permissions(db)
        db.commit()

        for tenant in tenants:
            seed_system_roles(db, tenant.id, perm_map)

        print("[seed_rbac] ALL DONE.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_all_tenants()
