import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.users import Pharmacy, Branch, UserBranch
from models.enterprise.branch import PharmacyBranch
from models.enterprise.user import BranchUserAssignment

def remove_zain_branch():
    db = SessionLocal()
    try:
        p = db.query(Pharmacy).filter(Pharmacy.name == "Zain Pharmacy").first()
        if p:
            branches = db.query(Branch).filter(Branch.pharmacy_id == p.id).all()
            for b in branches:
                db.query(UserBranch).filter(UserBranch.branch_id == b.id).delete()
                db.query(BranchUserAssignment).filter(BranchUserAssignment.branch_id == b.id).delete()
                db.query(PharmacyBranch).filter(PharmacyBranch.id == b.id).delete()
                db.delete(b)
            db.commit()
            print("Zain Pharmacy branches deleted successfully.")
        else:
            print("Zain Pharmacy not found.")
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    remove_zain_branch()
