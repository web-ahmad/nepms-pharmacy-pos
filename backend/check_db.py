import sys
sys.path.insert(0, '.')
from database import SessionLocal
from models.inventory import Medicine
from models.users import Tenant

db = SessionLocal()

total = db.query(Medicine).count()
print(f"Total medicines in DB: {total}")

# Get first tenant
tenant = db.query(Tenant).first()
if tenant:
    print(f"First tenant: {tenant.id} / {tenant.name}")
    with_tenant = db.query(Medicine).filter(Medicine.tenant_id == tenant.id).count()
    print(f"Medicines with this tenant_id: {with_tenant}")
else:
    print("No tenants found!")

without = db.query(Medicine).filter(Medicine.tenant_id == None).count()
print(f"Medicines with tenant_id=NULL: {without}")

# Show first 3 medicines
for m in db.query(Medicine).limit(3).all():
    print(f"  Medicine: {m.name} | tenant_id: {m.tenant_id}")

db.close()
