import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.users import Tenant, User, UserBranch, Role, Branch, Pharmacy
from models.enterprise.user import EnterpriseUser, BranchUserAssignment, EnterpriseRole
from models.enterprise.branch import PharmacyBranch
import uuid

def fix_users_and_branches():
    db = SessionLocal()
    try:
        # Get all enterprise users
        enterprise_users = db.query(EnterpriseUser).all()
        for eu in enterprise_users:
            if eu.user_type == "OWNER":
                # Ensure they have the correct EnterpriseRole
                role = db.query(EnterpriseRole).filter(EnterpriseRole.name == "Pharmacy Owner").first()
                if not role:
                    role = EnterpriseRole(
                        id=str(uuid.uuid4()),
                        name="Pharmacy Owner",
                        description="Owner of the Pharmacy",
                        is_system_default=True,
                        hierarchy_level=2,
                        branch_scope="all_branches",
                        data_scope="tenant"
                    )
                    db.add(role)
                    db.flush()
                eu.enterprise_role_id = role.id

        # Make sure every legacy Branch has a corresponding PharmacyBranch
        legacy_branches = db.query(Branch).all()
        for branch in legacy_branches:
            pb = db.query(PharmacyBranch).filter(PharmacyBranch.id == branch.id).first()
            if not pb:
                pb = PharmacyBranch(
                    id=branch.id,
                    name=branch.name,
                    code=branch.code,
                    pharmacy_id=branch.pharmacy_id,
                )
                db.add(pb)
        
        db.commit()
        print("Success")
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_users_and_branches()
