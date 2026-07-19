import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.inventory import Batch, Medicine
from models.users import Branch
from sqlalchemy import func

db = SessionLocal()
main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
tenant_id = main_branch.tenant_id
branch_id = main_branch.id

# Find 'Sypro' with fuzzy - maybe 'Sypr' or similar
meds_all = db.query(Medicine).filter(Medicine.tenant_id == tenant_id).all()
sypro_candidates = [m for m in meds_all if 'syp' in m.name.lower() or 'sypro' in m.name.lower()]
print("Sypro candidates:", [(m.name, m.id) for m in sypro_candidates])

# Now let's check specifically what's showing in the frontend:
# The frontend shows "Sypro Test" 100 qty @ Rs 100.00 selling price, stock value Rs 10000
# and "Panadol Test" 60 qty @ Rs 14.38 selling price, stock value Rs 750

# These are user manually created. Let's search all medicines created recently with 
# names matching exactly
for m in meds_all:
    if m.name in ['Sypro', 'Panadol']:
        print(f"EXACT MATCH: {m.name}")
        for b in m.batches:
            print(f"  Batch: qty={b.current_quantity}, purchase_price={b.purchase_price}, status={b.status}, branch={b.branch_id}")

# Check total valuation from DB
result = db.query(
    func.sum(Batch.current_quantity * Batch.purchase_price).label("stock_val"),
).select_from(Batch).join(Medicine).filter(
    Medicine.tenant_id == tenant_id,
    Batch.status == 'Active',
    Batch.branch_id == branch_id
).first()
print(f"\nTotal stock val: {result.stock_val}")
