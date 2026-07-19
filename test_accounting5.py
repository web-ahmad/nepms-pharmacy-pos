import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.inventory import Batch, Medicine

db = SessionLocal()
meds = db.query(Medicine).all()
for m in meds:
    print(f"Med {m.name}: tenant_id={m.tenant_id}")
    for b in m.batches:
        print(f"  Batch {b.batch_number}: tenant_id={b.tenant_id}, branch_id={b.branch_id}")
