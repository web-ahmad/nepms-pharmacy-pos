import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from models.inventory import Batch, Medicine
from models.accounts import JournalEntry, JournalEntryLine

db = SessionLocal()

# 1. Fix Batch tenant_id
batches = db.query(Batch).filter(Batch.tenant_id == None).all()
fixed_batches = 0
for b in batches:
    med = db.query(Medicine).filter(Medicine.id == b.medicine_id).first()
    if med and med.tenant_id:
        b.tenant_id = med.tenant_id
        fixed_batches += 1

db.commit()
print(f"Fixed tenant_id for {fixed_batches} batches.")

# 2. Delete wrong JournalEntries created by previous patch
bad_jes = db.query(JournalEntry).filter(JournalEntry.tenant_id == None, JournalEntry.source_module == "Inventory").all()
bad_je_ids = [je.id for je in bad_jes]

deleted_lines = 0
if bad_je_ids:
    deleted_lines = db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id.in_(bad_je_ids)).delete(synchronize_session=False)
    db.query(JournalEntry).filter(JournalEntry.id.in_(bad_je_ids)).delete(synchronize_session=False)

db.commit()
print(f"Deleted {len(bad_je_ids)} bad JournalEntries and {deleted_lines} lines.")
