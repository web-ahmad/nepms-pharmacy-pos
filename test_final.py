import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from services.dashboard_service import get_inventory_overview
from repositories.accounts import AccountsRepository
from models.users import Branch

db = SessionLocal()

main_branch = db.query(Branch).filter(Branch.name.ilike('%Main%')).first()
print(f"Testing for Tenant: {main_branch.tenant_id}, Branch: {main_branch.id}")

# 1. Test Dashboard Service
overview = get_inventory_overview(db, main_branch.tenant_id, main_branch.id)
print("Dashboard Inventory Value:", overview.stock_valuation)

# 2. Test Accounts Repository
acc_repo = AccountsRepository(db)
accs = acc_repo.get_accounts(main_branch.tenant_id, main_branch.id)

inv_acc = next((a for a in accs if a.code == "1020"), None)
if inv_acc:
    print("Accounting 1020 Balance:", inv_acc.current_balance)
else:
    print("Account 1020 not found.")
