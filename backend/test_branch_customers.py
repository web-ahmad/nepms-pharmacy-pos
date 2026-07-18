import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from services.enterprise.branch_service import branch_service

class MockScope:
    def __init__(self, pharmacy_id, role, user_id):
        self.pharmacy_id = pharmacy_id
        self.role = role
        self.user_id = user_id

def test_branch_customers():
    db = SessionLocal()
    try:
        from models.enterprise.branch import PharmacyBranch
        bmc_branch = db.query(PharmacyBranch).filter(PharmacyBranch.name.ilike('%BMC%')).first()
        if not bmc_branch:
            print("BMC branch not found.")
            return

        print(f"Testing for branch: {bmc_branch.name} ({bmc_branch.id})")
        scope = MockScope(pharmacy_id=bmc_branch.pharmacy_id, role="admin", user_id="test")
        
        # Call the function
        res = branch_service.list_branch_customers(db, scope, bmc_branch.id)
        print("Customers:", res)
        
        # Test get_branch_stats
        stats = branch_service.get_branch_stats(db, scope, bmc_branch.id)
        print("Stats Total Customers:", getattr(stats, "total_customers", None))

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_branch_customers()
