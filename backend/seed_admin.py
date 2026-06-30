import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models # Import all models to ensure metadata is populated
from models.users import User, Role, Tenant
from core.security import get_password_hash
import uuid

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create Tenant
    tenant = db.query(Tenant).filter(Tenant.subdomain == "demo").first()
    if not tenant:
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name="Demo Pharmacy",
            subdomain="demo"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    # Create Super Admin Role
    role = db.query(Role).filter(Role.name == "Super Admin").first()
    if not role:
        role = Role(
            id=str(uuid.uuid4()),
            name="Super Admin",
            description="Full Access",
            permissions='["all"]'
        )
        db.add(role)
        db.commit()
        db.refresh(role)

    # Create User
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            is_super_admin=True,
            tenant_id=tenant.id,
            role_id=role.id
        )
        db.add(admin)
        db.commit()

    print("Database seeded with user: admin / admin123")
    db.close()

if __name__ == "__main__":
    seed()
