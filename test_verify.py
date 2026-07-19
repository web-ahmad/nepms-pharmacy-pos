import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import JournalEntry, JournalEntryLine, Account
from models.users import Branch

db = SessionLocal()

main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
branch_id = main_branch.id
tenant_id = main_branch.tenant_id

# Count JE lines with main branch
lines_with_branch = db.query(JournalEntryLine).filter(JournalEntryLine.branch_id == branch_id).count()
lines_without = db.query(JournalEntryLine).filter(JournalEntryLine.branch_id == None).count()
print(f"JE Lines with Main Branch: {lines_with_branch}")
print(f"JE Lines without branch: {lines_without}")

# Check the specific 1020 account balance query result
from sqlalchemy import func
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

print(f"\nAccount balances for Main Branch:")
for r in rows:
    acc = db.query(Account).filter(Account.id == r.account_id).first()
    acc_code = acc.code if acc else "Unknown"
    print(f"  Account {acc_code}: Debit={r.td}, Credit={r.tc}")
