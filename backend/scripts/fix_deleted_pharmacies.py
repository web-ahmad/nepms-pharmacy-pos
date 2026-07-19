import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.users import Pharmacy, Tenant, User, Branch

def fix_deleted_pharmacies():
    db = SessionLocal()
    try:
        deleted_pharmacies = db.query(Pharmacy).filter(Pharmacy.is_deleted == True).all()
        for p in deleted_pharmacies:
            if p.tenant_id:
                print(f"Cascading delete for pharmacy {p.name} (Tenant: {p.tenant_id})")
                tenant = db.query(Tenant).filter(Tenant.id == p.tenant_id).first()
                if tenant:
                    tenant.is_active = False
                
                db.query(User).filter(User.tenant_id == p.tenant_id).update({
                    "is_active": False,
                    "is_deleted": True
                })
                db.query(Branch).filter(Branch.tenant_id == p.tenant_id).update({
                    "is_deleted": True
                })
        
        db.commit()
        print("Cleanup completed!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_deleted_pharmacies()
