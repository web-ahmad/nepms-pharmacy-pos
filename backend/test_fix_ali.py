import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal

def fix_ali_customer():
    db = SessionLocal()
    try:
        from models.enterprise.branch import PharmacyBranch
        from models.crm import Customer
        
        bmc_branch = db.query(PharmacyBranch).filter(PharmacyBranch.name.ilike('%BMC%')).first()
        if not bmc_branch:
            print("BMC branch not found.")
            return

        ali = db.query(Customer).filter(Customer.full_name.ilike('%Ali%')).first()
        if ali:
            ali.preferred_branch_id = bmc_branch.id
            db.commit()
            print(f"Assigned Customer {ali.full_name} to Branch {bmc_branch.name}.")
        else:
            print("Customer Ali not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_ali_customer()
