import os
import sys

# Add backend directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.users import Role, User, Tenant, Branch
from core.security import get_password_hash
import uuid

def seed():
    db = SessionLocal()
    try:
        # Get or create a tenant and branch for the seed
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(id=str(uuid.uuid4()), name="Default Pharmacy", subdomain="demo")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            
        branch = db.query(Branch).filter(Branch.tenant_id == tenant.id).first()
        if not branch:
            branch = Branch(id=str(uuid.uuid4()), name="Main Branch", tenant_id=tenant.id, is_main=True)
            db.add(branch)
            db.commit()
            
        # Seed Roles
        roles_data = [
            {"name": "Super Admin", "permissions": '["*"]'},
            {"name": "Admin", "permissions": '["pos.access", "inventory.manage", "users.manage", "reports.view"]'},
            {"name": "Cashier", "permissions": '["pos.access", "cashier.manage"]'},
            {"name": "Order Taker", "permissions": '["pos.access"]'}
        ]
        
        roles_map = {}
        for rd in roles_data:
            role = db.query(Role).filter(Role.name == rd["name"]).first()
            if not role:
                role = Role(
                    id=str(uuid.uuid4()),
                    name=rd["name"],
                    permissions=rd["permissions"]
                )
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"Created role: {role.name}")
            else:
                print(f"Role {role.name} already exists.")
            roles_map[role.name] = role
            
        # Create Test Cashier User
        cashier_role = roles_map.get("Cashier")
        test_username = "test_cashier"
        test_email = f"{uuid.uuid4().hex[:8]}@demo.com"
        test_password = "password123"
        
        user = db.query(User).filter(User.username == test_username).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                username=test_username,
                email=test_email,
                hashed_password=get_password_hash(test_password),
                full_name="Test Cashier",
                role_id=cashier_role.id,
                tenant_id=tenant.id,
                is_active=True
            )
            db.add(user)
            db.commit()
            print(f"Created test user: {test_username} / {test_password}")
        else:
            print(f"Test user {test_username} already exists.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed()
