import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import JournalEntry, JournalEntryLine, Account

db = SessionLocal()

# Check what account 1020 IDs exist and their tenants
accs = db.query(Account).filter(Account.code == "1020").all()
for a in accs:
    print(f"Account 1020: id={a.id}, tenant_id={a.tenant_id}, balance={a.current_balance}")

# Check all JE Lines with account_id matching 1020 accounts
for a in accs:
    lines = db.query(JournalEntryLine).filter(JournalEntryLine.account_id == a.id).all()
    print(f"Lines for account {a.id}: {len(lines)}")
    for l in lines[:3]:
        je = db.query(JournalEntry).filter(JournalEntry.id == l.journal_entry_id).first()
        print(f"  Line: debit={l.debit}, credit={l.credit}, branch={l.branch_id}, JE.tenant_id={je.tenant_id if je else 'None'}, JE.status={je.status if je else 'None'}")
