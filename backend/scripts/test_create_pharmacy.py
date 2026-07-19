import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.users import Tenant, User, UserBranch, Role, Branch, Pharmacy
from models.enterprise.user import EnterpriseUser, BranchUserAssignment
from core.security import get_password_hash
from services.accounts_service import AccountsService
import uuid
from datetime import datetime

def test_create():
    db = SessionLocal()
    try:
        tenant_id = str(uuid.uuid4())
        tenant = Tenant(
            id=tenant_id,
            name="Test",
            subdomain=f"pharmacy-{tenant_id[:8]}",
            is_active=True
        )
        db.add(tenant)
        db.flush()

        AccountsService(db).seed_default_chart(tenant.id)

        pharmacy = Pharmacy(
            id=str(uuid.uuid4()),
            name="Test",
            owner_contact="123",
            subscription_status="active",
            is_active=True,
            tenant_id=tenant.id,
            created_at=datetime.utcnow(),
        )
        db.add(pharmacy)
        db.flush()

        branch = Branch(
            id=str(uuid.uuid4()),
            name="Main Branch",
            code=f"BR-{pharmacy.id[:6].upper()}",
            is_main=True,
            pharmacy_id=pharmacy.id,
            tenant_id=tenant.id,
        )
        db.add(branch)
        db.flush()

        auth_user = User(
            id=str(uuid.uuid4()),
            username="testadmin",
            email="test@pharmacy.local",
            hashed_password=get_password_hash("test"),
            full_name="Pharmacy Admin",
            is_active=True,
            tenant_id=tenant.id,
        )
        db.add(auth_user)
        db.flush()

        role = db.query(Role).filter(Role.name == "Pharmacy Owner").first()
        if not role:
            role = Role(
                id=str(uuid.uuid4()),
                name="Pharmacy Owner",
                description="Owner of the Pharmacy",
                is_system_default=True
            )
            db.add(role)
            db.flush()
            
        enterprise_user = EnterpriseUser(
            id=str(uuid.uuid4()),
            user_id=auth_user.id,
            enterprise_role_id=role.id,
            user_type="OWNER"
        )
        db.add(enterprise_user)
        db.flush()

        ub = UserBranch(id=str(uuid.uuid4()), user_id=auth_user.id, branch_id=branch.id)
        db.add(ub)
        
        bua = BranchUserAssignment(
            id=str(uuid.uuid4()),
            enterprise_user_id=enterprise_user.id,
            branch_id=branch.id,
            is_default_branch=True
        )
        db.add(bua)
        
        db.commit()
        print("Success")
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_create()
