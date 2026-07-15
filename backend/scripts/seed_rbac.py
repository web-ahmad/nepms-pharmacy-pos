import os
import sys
import uuid
from typing import Dict, List

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from models.users import Role, Permission, RolePermission

# Define the exhaustive list of granular permissions
SYSTEM_PERMISSIONS = [
    {"module": "narcotics", "action": "dispense", "code": "narcotics:dispense"},
    {"module": "pos", "action": "create_order", "code": "pos:create_order"},
    {"module": "pos", "action": "approve_refund", "code": "pos:approve_refund"},
    {"module": "profit", "action": "view", "code": "profit:view"},
    {"module": "stock", "action": "adjust", "code": "stock:adjust"},
    {"module": "shift", "action": "manage", "code": "shift:manage"},
    {"module": "settings", "action": "manage", "code": "settings:manage"},
    {"module": "users", "action": "manage", "code": "users:manage"},
    {"module": "inventory", "action": "view", "code": "inventory:view"},
    {"module": "inventory", "action": "manage", "code": "inventory:manage"},
    {"module": "inventory", "action": "transfer", "code": "inventory:transfer"},
    {"module": "reports", "action": "view", "code": "reports:view"},
    {"module": "crm", "action": "view", "code": "crm:view"},
    {"module": "purchase", "action": "view", "code": "purchase:view"},
    {"module": "purchase", "action": "manage", "code": "purchase:manage"},
    {"module": "purchase", "action": "approve", "code": "purchase:approve"},
    {"module": "purchase", "action": "receive", "code": "purchase:receive"},
    {"module": "purchase", "action": "request", "code": "purchase:request"},
    {"module": "analytics", "action": "view", "code": "analytics:view"},
    {"module": "prescription", "action": "view", "code": "prescription:view"},
    {"module": "prescription", "action": "manage", "code": "prescription:manage"},
    {"module": "audit", "action": "view", "code": "audit:view"},
    {"module": "sales", "action": "discount", "code": "sales:discount"},
    {"module": "sales", "action": "override", "code": "sales:override"},
    {"module": "sales", "action": "credit", "code": "sales:credit"},
    {"module": "sales", "action": "loyalty", "code": "sales:loyalty"},
    {"module": "sales", "action": "promotion", "code": "sales:promotion"},
    {"module": "sales", "action": "coupon", "code": "sales:coupon"},
    {"module": "sales", "action": "shift", "code": "sales:shift"},
    {"module": "sales", "action": "drawer", "code": "sales:drawer"},
    {"module": "sales", "action": "transfer", "code": "sales:transfer"},
    {"module": "sales", "action": "analytics", "code": "sales:analytics"},
    {"module": "accounts", "action": "view", "code": "accounts:view"},
    {"module": "accounts", "action": "create", "code": "accounts:create"},
    {"module": "accounts", "action": "approve", "code": "accounts:approve"}
]

# Define default roles and their assigned permission codes
DEFAULT_ROLES = {
    "Super Admin": [p["code"] for p in SYSTEM_PERMISSIONS], # All permissions
    "Owner": [p["code"] for p in SYSTEM_PERMISSIONS], # Alias for full access
    "Branch Manager": [
        "pos:create_order", "pos:approve_refund", "profit:view", "stock:adjust",
        "shift:manage", "inventory:view", "inventory:manage", "inventory:transfer", "reports:view",
        "crm:view", "purchase:view", "purchase:manage", "purchase:approve", "purchase:receive", "purchase:request", "analytics:view",
        "sales:discount", "sales:override", "sales:credit", "sales:loyalty", "sales:promotion", "sales:coupon", "sales:shift", "sales:drawer", "sales:transfer", "sales:analytics",
        "accounts:view", "accounts:create"
    ],
    "Senior Pharmacist": [
        "pos:create_order", "narcotics:dispense", "inventory:view", "prescription:view", "prescription:manage"
    ],
    "Junior Pharmacist": [
        "pos:create_order", "inventory:view"
    ],
    "Cashier": [
        "pos:create_order", "shift:manage",
        "sales:discount", "sales:loyalty", "sales:promotion", "sales:coupon", "sales:shift", "sales:drawer"
    ],
    "Order Taker": [
        "pos:create_order"
    ],
    "Inventory Controller": [
        "inventory:view", "inventory:manage", "inventory:transfer", "stock:adjust", "purchase:view", "purchase:manage", "purchase:receive", "purchase:request"
    ],
    "Accounts Manager": [
        "reports:view", "profit:view", "accounts:view", "accounts:create", "accounts:approve"
    ],
    "Auditor": [
        "reports:view", "analytics:view", "audit:view", "profit:view", "accounts:view"
    ],
    "Inventory Manager": [
        "inventory:view", "inventory:manage", "inventory:transfer", "stock:adjust", "purchase:view", "purchase:manage", "purchase:approve", "purchase:receive", "purchase:request"
    ]
}

def seed_rbac_permissions_and_roles(db: Session) -> Dict[str, Role]:
    print("Seeding RBAC Permissions...")
    # Seed Permissions
    permission_objects = {}
    for p_data in SYSTEM_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.code == p_data["code"]).first()
        if not perm:
            perm = Permission(id=str(uuid.uuid4()), **p_data)
            db.add(perm)
        permission_objects[p_data["code"]] = perm
    db.flush()

    print("Seeding RBAC Default Roles...")
    # Seed Roles
    role_objects = {}
    for role_name, perm_codes in DEFAULT_ROLES.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(
                id=str(uuid.uuid4()), 
                name=role_name, 
                description=f"System default role: {role_name}",
                is_system_default=True
            )
            db.add(role)
            db.flush()
        
        # Link permissions
        # Clear existing mappings if any
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
        db.flush()
        
        for code in perm_codes:
            if code in permission_objects:
                rp = RolePermission(id=str(uuid.uuid4()), role_id=role.id, permission_id=permission_objects[code].id)
                db.add(rp)
        
        role_objects[role_name] = role
    db.flush()
    return role_objects

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
