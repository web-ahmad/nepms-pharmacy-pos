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

print(f"Branch: {branch_id}, Tenant: {tenant_id}")

# These are the 2 medicines the user manually added (Sypro: 100 qty, Panadol: 60 qty)
meds = db.query(Medicine).filter(Medicine.tenant_id == tenant_id).order_by(Medicine.created_at.desc()).limit(5).all()
print("\nRecent medicines:")
for m in meds:
    print(f"  {m.name}: id={m.id}")
    for b in m.batches:
        print(f"    Batch {b.id}: qty={b.current_quantity}, purchase_price={b.purchase_price}, status={b.status}, branch={b.branch_id}")

# The Inventory Value query from dashboard_service
result = db.query(
    func.sum(Batch.current_quantity * Batch.purchase_price).label("stock_val"),
    func.sum(Batch.reserved_quantity * Batch.purchase_price).label("reserved_val")
).select_from(Batch).join(Medicine).filter(
    Medicine.tenant_id == tenant_id,
    Batch.status == 'Active'
).filter(Batch.branch_id == branch_id).first()

print(f"\nDashboard Stock Valuation: {result.stock_val}")

# Check with cost_per_base_unit instead
result2 = db.query(
    func.sum(Batch.current_quantity * Batch.cost_per_base_unit).label("stock_val"),
).select_from(Batch).join(Medicine).filter(
    Medicine.tenant_id == tenant_id,
    Batch.status == 'Active',
    Batch.branch_id == branch_id
).first()
print(f"With cost_per_base_unit: {result2.stock_val}")

# Check medicine stock_value calculation
result3 = db.query(
    func.sum(Batch.current_quantity * Medicine.cost_per_base_unit).label("stock_val"),
).select_from(Batch).join(Medicine).filter(
    Medicine.tenant_id == tenant_id,
    Batch.status == 'Active',
    Batch.branch_id == branch_id
).first()
print(f"With Medicine.cost_per_base_unit: {result3.stock_val}")
