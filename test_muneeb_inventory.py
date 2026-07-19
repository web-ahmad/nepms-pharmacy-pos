import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from services.dashboard_service import get_inventory_overview
from models.users import User, Branch

db = SessionLocal()

try:
    muneeb = db.query(User).filter(User.username == 'muneeb').first()
    if not muneeb:
        print("Muneeb not found")
    else:
        print("Muneeb found:", muneeb.username, "tenant:", muneeb.tenant_id, "branch:", muneeb.branch_scope)
        # get muneeb's branch
        from models.users import UserBranch
        user_branch = db.query(UserBranch).filter(UserBranch.user_id == muneeb.id).first()
        branch_id = user_branch.branch_id if user_branch else None
        print("Muneeb branch_id:", branch_id)
        
        if branch_id:
            res = get_inventory_overview(db, muneeb.tenant_id, branch_id)
            print("Muneeb Inventory Overview:")
            print(f"Total Medicines: {res.total_medicines}")
            print(f"Stock Valuation: {res.stock_valuation}")
            print(f"Available Value: {res.available_value}")
            print(f"Reserved Value: {res.reserved_value}")
            print(f"Dead Stock Count: {res.dead_stock_count}")
except Exception as e:
    import traceback
    traceback.print_exc()
