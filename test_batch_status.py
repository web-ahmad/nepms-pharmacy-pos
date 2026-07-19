import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.inventory import Batch

db = SessionLocal()
batches = db.query(Batch).all()
status_counts = {}
for b in batches:
    status_counts[b.status] = status_counts.get(b.status, 0) + 1
print(f"Batch statuses: {status_counts}")
