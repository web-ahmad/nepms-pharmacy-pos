import sys
import os

backend_dir = r'c:\Users\DEVJiX\Desktop\New folder\backend'
sys.path.append(backend_dir)
os.chdir(backend_dir)

from database import SessionLocal
from services.inventory_service import InventoryService

db = SessionLocal()

# Get a valid tenant and branch
tenant_res = db.execute("SELECT tenant_id, id FROM branches LIMIT 1").fetchone()
if not tenant_res:
    print("No tenants found!")
    sys.exit(1)

tenant_id, branch_id = tenant_res[0], tenant_res[1]

print(f"Testing low stock for tenant {tenant_id} branch {branch_id}")

try:
    results = InventoryService.get_low_stock(db, tenant_id, branch_id)
    print("Low Stock Results:")
    print(results)
except Exception as e:
    import traceback
    traceback.print_exc()

db.close()
