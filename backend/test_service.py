import sys
import os

backend_dir = r'c:\Users\DEVJiX\Desktop\New folder\backend'
sys.path.append(backend_dir)
os.chdir(backend_dir)

from database import SessionLocal
from services.purchase_service import PurchaseService
from models.user import Tenant, Branch

db = SessionLocal()
tenant = db.query(Tenant).first()
branch = db.query(Branch).first()

print(f"Testing with Tenant: {tenant.id}, Branch: {branch.id}")

try:
    results = PurchaseService.get_auto_suggest(
        db=db, 
        tenant_id=tenant.id, 
        branch_id=branch.id, 
        region=None, 
        supplier_id=None, 
        strategy="low_stock"
    )
    print("RESULTS LENGTH:", len(results))
    print(results)
except Exception as e:
    import traceback
    traceback.print_exc()

db.close()
