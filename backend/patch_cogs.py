import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from models.accounts import JournalEntry, JournalEntryLine, Account
from sqlalchemy import func

db = SessionLocal()

# Find the COGS account and Purchase Returns account
accounts = db.query(Account).filter(Account.code.in_(["5000", "5010"])).all()

acc_5000 = next((a for a in accounts if a.code == "5000"), None)
acc_5010 = next((a for a in accounts if a.code == "5010"), None)

if not acc_5000 or not acc_5010:
    print("Could not find required accounts 5000 and 5010. Skipping.")
    sys.exit(0)

# Find all journal entry lines linked to "Auto Post: Cost of Goods Sold" 
# where account_id is 5000 (Purchase Returns)

# The description is on the JournalEntry model
je_query = db.query(JournalEntry).filter(JournalEntry.description.like("%Auto Post: Cost of Goods Sold%"))

updated_lines = 0

for je in je_query.all():
    # Update the lines that use acc_5000.id to acc_5010.id
    for line in je.lines:
        if line.account_id == acc_5000.id:
            line.account_id = acc_5010.id
            updated_lines += 1

db.commit()
print(f"Fixed {updated_lines} historical COGS journal lines, changing from {acc_5000.name} to {acc_5010.name}.")
