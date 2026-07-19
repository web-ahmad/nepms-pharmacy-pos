import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from models.inventory import Batch, Medicine
from models.accounts import JournalEntry, JournalEntryLine
from services.auto_posting_service import AutoPostingService
from sqlalchemy import func

db = SessionLocal()
auto_poster = AutoPostingService(db)

# 1. Fix purchase_price in Batch where it's 0 but Medicine has cost_per_base_unit
batches = db.query(Batch).filter(Batch.purchase_price == 0, Batch.current_quantity > 0).all()
fixed_price = 0
for b in batches:
    med = db.query(Medicine).filter(Medicine.id == b.medicine_id).first()
    if med and med.cost_per_base_unit and med.cost_per_base_unit > 0:
        b.purchase_price = med.cost_per_base_unit
        fixed_price += 1

db.commit()
print(f"Fixed purchase_price for {fixed_price} batches.")

# 2. Post opening stock for batches that don't have a journal entry
all_batches = db.query(Batch).filter(Batch.current_quantity > 0).all()
posted = 0
for b in all_batches:
    # Check if a JournalEntry exists for this batch
    je = db.query(JournalEntry).filter(JournalEntry.source_id == b.id, JournalEntry.source_module == "Inventory").first()
    if not je:
        med = db.query(Medicine).filter(Medicine.id == b.medicine_id).first()
        total_value = b.current_quantity * (b.purchase_price or 0.0)
        if total_value > 0:
            try:
                # Need an admin user from that tenant to be the creator
                from models.users import User
                admin = db.query(User).filter(User.tenant_id == b.tenant_id).first()
                admin_id = admin.id if admin else 'system'
                
                auto_poster.post_opening_stock(
                    tenant_id=b.tenant_id,
                    user_id=admin_id,
                    reference=f"OPENING-MED-{med.id[:8]}",
                    amount=total_value,
                    description=f"Opening Stock for {med.name}",
                    branch_id=b.branch_id,
                    source_module="Inventory",
                    source_id=b.id
                )
                posted += 1
            except Exception as e:
                print(f"Error posting for batch {b.id}: {e}")

db.commit()
print(f"Posted {posted} missing journal entries for existing batches.")
