import os
import sys
import uuid
from typing import Dict, List

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from models.users import Role, Permission, RolePermission

MODULES = [
    "dashboard", "sales", "inventory", "purchase", "crm", "pos", "reports", "accounts", "hr", "payroll",
    "attendance", "leave", "documents", "performance", "narcotics", "stock", "shift", "settings", "users",
    "roles", "branches", "tenants", "audit", "loyalty", "promotions", "gift_cards", "prescriptions",
    "suppliers", "customers", "patients", "doctors", "clinics", "delivery", "ecommerce", "whatsapp",
    "email", "sms", "notifications", "devices", "printers", "scanners", "cash_drawer", "rfid", "barcodes",
    "import", "export", "backup", "restore", "logs", "metrics", "billing", "subscriptions", "taxes",
    "expenses", "petty_cash", "bank", "cheques", "credit_cards", "wallets", "refunds", "returns",
    "exchanges", "discounts", "coupons", "campaigns", "segments", "leads", "tickets", "knowledge_base",
    "assets", "maintenance", "contracts", "insurance", "claims", "settlements", "login_audit", "rbac_audit",
    "sales_audit", "purchase_audit", "inventory_audit", "accounting_audit", "hr_audit", "crm_audit",
    "pos_audit", "settings_audit", "api_audit", "device_audit", "cash_audit", "stock_audit", "branch_audit",
    "system_audit"
]

ACTIONS = [
    "view", "create", "update", "delete", "approve", "reject", "void", "return", "adjust_stock", 
    "export", "import", "print", "email", "sms", "whatsapp", "schedule", "assign", "revoke", 
    "transfer", "receive", "request", "override", "discount", "refund", "exchange", "audit",
    "backup", "restore", "configure", "publish"
]

# Generate dynamic permissions
DYNAMIC_PERMISSIONS = []
for mod in MODULES:
    for act in ACTIONS:
        DYNAMIC_PERMISSIONS.append({
            "module": mod,
            "action": act,
            "code": f"{mod}:{act}"
        })

# Map 25 Enterprise roles with Branch Scope and Data Scope
# Format: { "Role Name": ("branch_scope", "data_scope", [list of perm codes or '*' for all]) }
DEFAULT_ROLES = {
    "Super Admin": ("global", "global", ["*"]),
    "Pharmacy Owner": ("global", "tenant", ["*"]),
    "General Manager": ("all_branches", "tenant", ["*"]),
    "Branch Manager": ("assigned_branch", "branch", [
        "dashboard:view", "sales:view", "sales:create", "sales:update", "pos:view", "pos:create", 
        "inventory:view", "inventory:update", "inventory:adjust_stock", "reports:view", "shift:view",
        "shift:update", "audit:view"
    ]),
    "Pharmacist": ("assigned_branch", "branch", [
        "dashboard:view", "pos:view", "pos:create", "sales:view", "sales:create", "inventory:view",
        "prescriptions:view", "prescriptions:create", "prescriptions:update"
    ]),
    "Senior Pharmacist": ("assigned_branch", "branch", [
        "dashboard:view", "pos:view", "pos:create", "sales:view", "sales:create", "inventory:view",
        "prescriptions:view", "prescriptions:create", "prescriptions:update", "narcotics:view",
        "narcotics:create", "narcotics:update", "narcotics:approve"
    ]),
    "Cashier": ("assigned_counter", "own_records", [
        "pos:view", "pos:create", "sales:view", "sales:create", "shift:view", "shift:update",
        "cash_drawer:view", "cash_drawer:update"
    ]),
    "Inventory Manager": ("all_branches", "tenant", [
        "inventory:view", "inventory:create", "inventory:update", "inventory:delete", "inventory:adjust_stock",
        "stock:view", "stock:create", "stock:update", "stock:transfer", "stock:receive"
    ]),
    "Store Keeper": ("assigned_branch", "branch", [
        "inventory:view", "inventory:update", "stock:view", "stock:update", "stock:receive"
    ]),
    "Purchase Officer": ("assigned_branch", "branch", [
        "purchase:view", "purchase:create", "purchase:update", "purchase:request", "suppliers:view"
    ]),
    "Purchase Manager": ("all_branches", "tenant", [
        "purchase:view", "purchase:create", "purchase:update", "purchase:approve", "purchase:delete",
        "suppliers:view", "suppliers:create", "suppliers:update"
    ]),
    "Accountant": ("assigned_branch", "branch", [
        "accounts:view", "accounts:create", "accounts:update", "expenses:view", "expenses:create",
        "billing:view", "billing:create"
    ]),
    "Finance Manager": ("all_branches", "tenant", [
        "accounts:view", "accounts:create", "accounts:update", "accounts:approve", "expenses:view", 
        "expenses:create", "expenses:approve", "reports:view", "reports:export", "taxes:view", "taxes:update"
    ]),
    "HR Manager": ("all_branches", "tenant", [
        "hr:view", "hr:create", "hr:update", "hr:delete", "payroll:view", "payroll:create", "payroll:update",
        "payroll:approve", "attendance:view", "attendance:update", "leave:view", "leave:approve", "users:view", "users:create", "users:update"
    ]),
    "Marketing Manager": ("all_branches", "tenant", [
        "crm:view", "crm:create", "crm:update", "campaigns:view", "campaigns:create", "campaigns:update",
        "promotions:view", "promotions:create", "promotions:update"
    ]),
    "CRM Executive": ("all_branches", "tenant", [
        "crm:view", "crm:create", "customers:view", "customers:create", "customers:update",
        "loyalty:view", "loyalty:update"
    ]),
    "Compliance Officer": ("all_branches", "tenant", [
        "audit:view", "audit:export", "settings:view", "reports:view", "users:view", "roles:view"
    ]),
    "Internal Auditor": ("all_branches", "tenant", [
        "audit:view", "audit:export", "sales_audit:view", "purchase_audit:view", "inventory_audit:view",
        "accounting_audit:view", "reports:view"
    ]),
    "System Auditor (Read Only)": ("all_branches", "tenant", [
        "audit:view", "sales_audit:view", "purchase_audit:view", "inventory_audit:view",
        "accounting_audit:view", "hr_audit:view", "pos_audit:view", "system_audit:view"
    ]),
    "Receptionist": ("assigned_branch", "branch", [
        "patients:view", "patients:create", "patients:update", "doctors:view", "dashboard:view"
    ]),
    "Doctor": ("assigned_branch", "branch", [
        "patients:view", "prescriptions:view", "prescriptions:create", "prescriptions:update"
    ]),
    "Lab Technician": ("assigned_branch", "branch", [
        "patients:view", "inventory:view"
    ]),
    "Delivery Rider": ("assigned_branch", "own_records", [
        "delivery:view", "delivery:update", "orders:view"
    ]),
    "Customer Support": ("all_branches", "tenant", [
        "customers:view", "customers:update", "tickets:view", "tickets:create", "tickets:update",
        "sales:view", "refunds:view", "refunds:create"
    ]),
    "Warehouse Manager": ("selected_branches", "selected_branches", [
        "inventory:view", "inventory:create", "inventory:update", "inventory:transfer", "stock:view",
        "stock:update", "stock:transfer", "stock:receive", "purchase:view", "purchase:receive"
    ])
}

def seed_rbac_permissions_and_roles(db: Session) -> Dict[str, Role]:
    print("Seeding RBAC Permissions (Idempotent)...")
    # Seed Permissions (skip if exists, insert if new)
    existing_perms = {p.code: p for p in db.query(Permission).all()}
    
    new_perms = []
    for p_data in DYNAMIC_PERMISSIONS:
        if p_data["code"] not in existing_perms:
            perm = Permission(id=str(uuid.uuid4()), **p_data)
            new_perms.append(perm)
            existing_perms[p_data["code"]] = perm
            
    if new_perms:
        db.add_all(new_perms)
        db.flush()
        print(f"Added {len(new_perms)} new permissions.")
    else:
        print("No new permissions to add.")

    print("Seeding Enterprise Roles (Idempotent)...")
    # Seed Roles
    existing_roles = {r.name: r for r in db.query(Role).all()}
    
    for role_name, config in DEFAULT_ROLES.items():
        branch_scope, data_scope, perm_codes = config
        
        role = existing_roles.get(role_name)
        if not role:
            role = Role(
                id=str(uuid.uuid4()), 
                name=role_name, 
                description=f"System default role: {role_name}",
                is_system_default=True,
                branch_scope=branch_scope,
                data_scope=data_scope
            )
            db.add(role)
            db.flush()
            existing_roles[role_name] = role
        else:
            # Update scope if it's missing or we want to enforce it for system defaults
            if role.is_system_default:
                role.branch_scope = branch_scope
                role.data_scope = data_scope
        
        # Link permissions without wiping custom ones (just add missing ones)
        # Fetch existing role permissions
        existing_rp = {rp.permission_id for rp in db.query(RolePermission).filter(RolePermission.role_id == role.id).all()}
        
        # Determine which permissions to attach
        if "*" in perm_codes:
            codes_to_add = list(existing_perms.keys())
        else:
            codes_to_add = perm_codes
            
        added_rp_count = 0
        for code in codes_to_add:
            perm = existing_perms.get(code)
            if perm and perm.id not in existing_rp:
                rp = RolePermission(id=str(uuid.uuid4()), role_id=role.id, permission_id=perm.id)
                db.add(rp)
                existing_rp.add(perm.id)
                added_rp_count += 1
                
        if added_rp_count > 0:
            print(f"Added {added_rp_count} missing permissions to role '{role_name}'.")

    db.flush()
    return existing_roles

if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_rbac_permissions_and_roles(db)
        db.commit()
        print("RBAC Seeded Successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding RBAC: {e}")
    finally:
        db.close()
