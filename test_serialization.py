import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import Account, JournalEntry, JournalEntryLine
from sqlalchemy import func

db = SessionLocal()

# Check the EXACT issue: SQLAlchemy ORM Identity Map
# When we query Account and then change acc.current_balance in memory,
# FastAPI/Pydantic MIGHT read from DB (the stored value = 0.0 or 2151075)
# or from Python's in-memory changed value

tenant_id = "05ff9a6a-46ac-46a9-ae89-79c499f140b5"
branch_id = "f2758a49-3621-4967-b3ef-9139e2630c51"

# Step 1: Query accounts
accounts = db.query(Account).filter(Account.tenant_id == tenant_id).all()
print("Before computation:")
inv_acc = next(a for a in accounts if a.code == "1020")
print(f"  1020 balance (from DB): {inv_acc.current_balance}")

# Step 2: Do the computation
rows = (
    db.query(
        JournalEntryLine.account_id,
        func.sum(JournalEntryLine.debit).label("td"),
        func.sum(JournalEntryLine.credit).label("tc"),
    )
    .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
    .filter(JournalEntry.tenant_id == tenant_id, JournalEntry.status == "Approved", JournalEntryLine.branch_id == branch_id)
    .group_by(JournalEntryLine.account_id)
    .all()
)
bal_map = {r.account_id: (r.td or 0.0, r.tc or 0.0) for r in rows}

from models.accounts import AccountCategory
for acc in accounts:
    td, tc = bal_map.get(acc.id, (0.0, 0.0))
    if acc.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
        acc.current_balance = round(td - tc, 4)
    else:
        acc.current_balance = round(tc - td, 4)

print("\nAfter computation:")
inv_acc = next(a for a in accounts if a.code == "1020")
print(f"  1020 balance (in-memory): {inv_acc.current_balance}")

# Step 3: Serialize using Pydantic (like FastAPI does)
from schemas.accounts import AccountResponse
resp = AccountResponse.model_validate(inv_acc)
print(f"\nAfter Pydantic serialize: {resp.current_balance}")

# KEY QUESTION: Does DB have the correct stored balance?
db2 = SessionLocal()
db_acc = db2.query(Account).filter(Account.id == inv_acc.id).first()
print(f"DB stored balance (fresh session): {db_acc.current_balance}")
db2.close()
