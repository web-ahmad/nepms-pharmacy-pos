import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal

def list_customers():
    db = SessionLocal()
    try:
        from models.crm import Customer
        customers = db.query(Customer).all()
        for c in customers:
            print(f"Customer: {c.full_name}, Preferred Branch: {c.preferred_branch_id}")
    finally:
        db.close()

if __name__ == "__main__":
    list_customers()
