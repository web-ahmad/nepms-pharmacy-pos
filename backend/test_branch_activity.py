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

def test_branch_activity():
    db = SessionLocal()
    try:
        from models.enterprise.branch import PharmacyBranch
        bmc_branch = db.query(PharmacyBranch).filter(PharmacyBranch.name.ilike('%BMC%')).first()
        if not bmc_branch:
            print("BMC branch not found.")
            return

        print(f"Testing activity for branch: {bmc_branch.name} ({bmc_branch.id})")
        scope = MockScope(pharmacy_id=bmc_branch.pharmacy_id, role="admin", user_id="test")
        
        # Test get_branch_activity without exception handler
        branch_id = bmc_branch.id
        data_bid = getattr(bmc_branch, "legacy_branch_id", None) or branch_id
        from models.audit import AuditEvent
        
        query = db.query(AuditEvent).filter(
            AuditEvent.branch_id == data_bid
        ).order_by(AuditEvent.created_at.desc())
        
        total = query.count()
        logs = query.offset((1 - 1) * 20).limit(20).all()
        print(f"Total: {total}, logs: {logs}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_branch_activity()
