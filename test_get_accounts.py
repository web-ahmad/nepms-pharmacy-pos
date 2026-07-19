import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from database import SessionLocal
from repositories.accounts import AccountsRepository
from models.users import Branch

db = SessionLocal()
acc_repo = AccountsRepository(db)

main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
tenant_id = main_branch.tenant_id
branch_id = main_branch.id

# This is the EXACT call made by the API
accs = acc_repo.get_accounts(tenant_id, branch_id=branch_id)

inv_accs = [a for a in accs if a.code == "1020"]
print(f"Number of 1020 accounts returned: {len(inv_accs)}")
for a in inv_accs:
    print(f"  id={a.id}, tenant_id={a.tenant_id}, balance={a.current_balance}")
    
print("\nAll returned accounts:")
for a in accs:
    print(f"  {a.code} - {a.name}: balance={a.current_balance}, tenant={a.tenant_id}")
