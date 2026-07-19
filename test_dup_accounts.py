import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from models.accounts import Account
from sqlalchemy import func

db = SessionLocal()

# The problem is clear: there are TWO account 1020 entries.
# abb85695 - has tenant_id set, HAS the JE lines 
# 6e448a72 - tenant_id=None, is the one being returned by get_accounts()

# When get_accounts() runs .filter(Account.tenant_id == tenant_id).all()
# it gets abb85695 which does have lines
# But when get_account_by_code() (used by auto_poster) runs, it might return 6e448a72...

# Let's check: the tenant's account query
tenant_id = "05ff9a6a-46ac-46a9-ae89-79c499f140b5"
accs = db.query(Account).filter(Account.tenant_id == tenant_id, Account.code == "1020").all()
print(f"Accounts 1020 with this tenant: {len(accs)}")
for a in accs:
    print(f"  id={a.id}, balance={a.current_balance}")

# The actual issue is likely that the 'None' tenant account (6e448a72) is being 
# returned in get_accounts query and OVERWRITING the correct balance
# Let's prove this by checking get_accounts filter result order

all_1020 = db.query(Account).filter(Account.code == "1020").order_by(Account.tenant_id.nullslast()).all()
print("\nAll 1020 accounts (sorted):")
for a in all_1020:
    print(f"  id={a.id}, tenant={a.tenant_id}, balance={a.current_balance}")
