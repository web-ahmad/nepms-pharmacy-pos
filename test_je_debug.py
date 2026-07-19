import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import JournalEntry, JournalEntryLine, Account
from models.users import Branch
from sqlalchemy import func

db = SessionLocal()

main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
tenant_id = main_branch.tenant_id
branch_id = main_branch.id
print(f"Main Branch: {branch_id}, Tenant: {tenant_id}")

# Get all JE lines for this tenant
all_lines = db.query(JournalEntryLine).join(
    JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id
).filter(JournalEntry.tenant_id == tenant_id, JournalEntry.status == "Approved").all()

print(f"Total Approved JE Lines for tenant: {len(all_lines)}")

# Check branch_id distribution in JE Lines
branch_counts = {}
for l in all_lines:
    b = l.branch_id or "None"
    branch_counts[b] = branch_counts.get(b, 0) + 1

print("JE Line branch_id distribution:", branch_counts)

# Check JE branch_id distribution 
jes = db.query(JournalEntry).filter(
    JournalEntry.tenant_id == tenant_id, 
    JournalEntry.status == "Approved"
).all()
je_branch_counts = {}
for je in jes:
    b = je.branch_id or "None"
    je_branch_counts[b] = je_branch_counts.get(b, 0) + 1
print("JE branch_id distribution:", je_branch_counts)

# Now simulate the exact get_accounts query
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
print(f"\nWith branch filter - Got {len(rows)} rows")

# Now without branch filter
rows_no_branch = (
    db.query(
        JournalEntryLine.account_id,
        func.sum(JournalEntryLine.debit).label("td"),
        func.sum(JournalEntryLine.credit).label("tc"),
    )
    .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
    .filter(JournalEntry.tenant_id == tenant_id, JournalEntry.status == "Approved")
    .group_by(JournalEntryLine.account_id)
    .all()
)
print(f"Without branch filter - Got {len(rows_no_branch)} rows")
for r in rows_no_branch:
    acc = db.query(Account).filter(Account.id == r.account_id).first()
    acc_code = acc.code if acc else "Unknown"
    print(f"  Account {acc_code}: Debit {r.td}, Credit {r.tc}")
