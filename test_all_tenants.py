import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.inventory import Medicine, Batch
from models.users import Branch

db = SessionLocal()

# Search for any medicine that could be Sypro - might be in a different pharmacy
all_meds = db.query(Medicine).all()
tenants = {}
for m in all_meds:
    t = m.tenant_id or "None"
    if t not in tenants:
        tenants[t] = []
    tenants[t].append(m.name)

print("Medicines per tenant:")
for t, names in tenants.items():
    print(f"  Tenant {t}: {len(names)} medicines")
    # Show unique medicine names
    for n in names[:5]:
        print(f"    {n}")
    if len(names) > 5:
        print(f"    ... and {len(names)-5} more")

# Check branches
branches = db.query(Branch).all()
print(f"\nBranches: {[(b.name, b.tenant_id) for b in branches]}")

# Check if there's a "Sypro" by looking at all pharmacies
sypro_search = db.query(Medicine).filter(Medicine.name.ilike('%syp%')).all()
print(f"\nSypro search results: {[(m.name, m.tenant_id) for m in sypro_search]}")
