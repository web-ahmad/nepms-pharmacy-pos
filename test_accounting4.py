import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import Account
from models.inventory import Batch

db = SessionLocal()

# Check tenant for 6e44...
acc1 = db.query(Account).filter(Account.id == "6e448a72-c594-4282-8120-4e0b733d523b").first()
if acc1:
    print(f"6e44 Account Code: {acc1.code}, Tenant: {acc1.tenant_id}")
else:
    print("6e44 account not found!")

# Check tenant for abb8...
acc2 = db.query(Account).filter(Account.id == "abb85695-2bca-47e7-a964-e08027914dc1").first()
if acc2:
    print(f"abb8 Account Code: {acc2.code}, Tenant: {acc2.tenant_id}")
else:
    print("abb8 account not found!")

# Which tenant has batches?
from sqlalchemy import func
batch_counts = db.query(Batch.tenant_id, func.count(Batch.id)).group_by(Batch.tenant_id).all()
print("Batches per tenant:")
for t, c in batch_counts:
    print(f"  Tenant {t}: {c} batches")

