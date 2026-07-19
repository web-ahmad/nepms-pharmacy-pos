import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from services.dashboard_service import get_inventory_overview

db = SessionLocal()

try:
    tenant_id = "a609dce0-0ec6-4ba3-ab23-14db64585db1" # from my knowledge, but let's just query one
    from models.users import Tenant
    tenant = db.query(Tenant).first()
    if tenant:
        res = get_inventory_overview(db, tenant.id)
        print("Tenant ok:", res)
        
        from models.users import Branch
        branch = db.query(Branch).filter_by(tenant_id=tenant.id).first()
        if branch:
            res_branch = get_inventory_overview(db, tenant.id, branch.id)
            print("Branch ok:", res_branch)
except Exception as e:
    import traceback
    traceback.print_exc()
