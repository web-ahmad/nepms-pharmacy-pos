import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import JournalEntry, JournalEntryLine, Account
from models.inventory import Batch

db = SessionLocal()

# Find the inventory account 1020
acc = db.query(Account).filter(Account.code == "1020").first()
if not acc:
    print("Account 1020 not found.")
    sys.exit(0)

print(f"Account 1020 ID: {acc.id}, Global Balance: {acc.current_balance}")

# Find lines for this account
lines = db.query(JournalEntryLine).filter(JournalEntryLine.account_id == acc.id).all()
print(f"Found {len(lines)} lines for Account 1020")
for l in lines[:5]:
    print(f"  Line {l.id}: Debit {l.debit}, Credit {l.credit}, Branch: {l.branch_id}, JE_ID: {l.journal_entry_id}")

# Check JE branch
jes = db.query(JournalEntry).filter(JournalEntry.id.in_([l.journal_entry_id for l in lines[:5]])).all()
for je in jes:
    print(f"  JE {je.id}: Status {je.status}, Branch: {je.branch_id}")

# Check branch ID of main branch
from models.users import Branch
main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
if main_branch:
    print(f"Main Branch ID: {main_branch.id}")
else:
    print("Main branch not found by name.")
