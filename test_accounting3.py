import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import Account
from models.users import Branch

db = SessionLocal()

branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
print(f"Main Branch ID: {branch.id}, Tenant ID: {branch.tenant_id}")

# Get all accounts for this tenant
accs = db.query(Account).filter(Account.tenant_id == branch.tenant_id).all()
print(f"Total Accounts for this Tenant: {len(accs)}")

for a in accs:
    if a.code == "1020":
        print(f"Found 1020 Inventory Account ID: {a.id}, Global Balance: {a.current_balance}, Branch ID: {a.branch_id}")

# Check JournalEntryLines for this account and branch
from models.accounts import JournalEntryLine
lines = db.query(JournalEntryLine).filter(JournalEntryLine.account_id == a.id).all()
print(f"Total Lines for this Account: {len(lines)}")
for l in lines[:5]:
    print(f"  Line {l.id}: Debit {l.debit}, Credit {l.credit}, Branch: {l.branch_id}")

# Run the exact query from get_accounts
from sqlalchemy import func
from models.accounts import JournalEntry

rows = (
    db.query(
        JournalEntryLine.account_id,
        func.sum(JournalEntryLine.debit).label("td"),
        func.sum(JournalEntryLine.credit).label("tc"),
    )
    .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
    .filter(JournalEntry.tenant_id == branch.tenant_id, JournalEntry.status == "Approved", JournalEntryLine.branch_id == branch.id)
    .group_by(JournalEntryLine.account_id)
    .all()
)
print("Accounts with branch balance rows:", len(rows))
for r in rows:
    if r.account_id == a.id:
        print(f"  Branch Balance for 1020: Debit sum {r.td}, Credit sum {r.tc}")

