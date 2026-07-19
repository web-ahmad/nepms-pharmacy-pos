import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import JournalEntry, JournalEntryLine

db = SessionLocal()

print("Total JE Lines:", db.query(JournalEntryLine).count())
print("Total JEs:", db.query(JournalEntry).count())

jes = db.query(JournalEntry).order_by(JournalEntry.id.desc()).limit(5).all()
for je in jes:
    print(f"JE: {je.id}, Source: {je.source_module}, Desc: {je.description}")
    for l in je.lines:
        print(f"  Line Account: {l.account_id}, Debit: {l.debit}, Credit: {l.credit}")
