import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.inventory import Batch, Medicine
from models.users import Branch, User
from sqlalchemy import func

db = SessionLocal()

# Find the admin user
admin = db.query(User).filter(User.username == 'admin').first()
if not admin:
    admin = db.query(User).first()
print(f"Admin user: {admin.username}, tenant_id: {admin.tenant_id}")

main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
tenant_id = main_branch.tenant_id
branch_id = main_branch.id

# Find "Sypro" and "Panadol"
sypro = db.query(Medicine).filter(Medicine.name.ilike('%Sypro%'), Medicine.tenant_id == tenant_id).first()
panadol = db.query(Medicine).filter(Medicine.name.ilike('%Panadol%'), Medicine.tenant_id == tenant_id).first()

print(f"\nSypro: {sypro}")
print(f"Panadol: {panadol}")

if sypro:
    print(f"\nSypro details: id={sypro.id}, cost={sypro.cost_per_base_unit}, tenant={sypro.tenant_id}")
    for b in sypro.batches:
        print(f"  Batch: qty={b.current_quantity}, purchase_price={b.purchase_price}, status={b.status}, branch={b.branch_id}, tenant={b.tenant_id}")
if panadol:
    print(f"\nPanadol details: id={panadol.id}, cost={panadol.cost_per_base_unit}, tenant={panadol.tenant_id}")
    for b in panadol.batches:
        print(f"  Batch: qty={b.current_quantity}, purchase_price={b.purchase_price}, status={b.status}, branch={b.branch_id}, tenant={b.tenant_id}")

# Total medicines count
total = db.query(Medicine).filter(Medicine.tenant_id == tenant_id).count()
print(f"\nTotal medicines in tenant: {total}")

# Get medicines with batches in main branch (this is what inventory shows)
meds_with_branch = db.query(Medicine).filter(
    Medicine.tenant_id == tenant_id,
    Medicine.batches.any(Batch.branch_id == branch_id)
).all()
print(f"Medicines with Main Branch batches: {len(meds_with_branch)}")
for m in meds_with_branch:
    # Calculate stock value like list shows
    for b in m.batches:
        if b.branch_id == branch_id and b.status == 'Active':
            stock_val = b.current_quantity * b.purchase_price
            print(f"  {m.name}: qty={b.current_quantity}, price={b.purchase_price}, stock_val={stock_val}")
