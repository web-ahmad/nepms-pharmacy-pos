import sys, traceback
sys.path.append('C:/Users/DEVJiX/Desktop/NEPMS/backend')
from database import SessionLocal
from core.pharmacy_scope import PharmacyScope
from services.enterprise.branch_service import branch_service
from models.enterprise.branch import PharmacyBranch
db = SessionLocal()
branch = db.query(PharmacyBranch).filter(PharmacyBranch.name.ilike('%Ellahabad%')).first()
if branch:
    print('Branch:', branch.name, branch.id, branch.pharmacy_id)
    scope = PharmacyScope(tenant_id=branch.tenant_id, pharmacy_id=branch.pharmacy_id, is_super_admin=False)
    try:
        res = branch_service.list_staff(db, scope, branch.id)
        print('Success list_staff, count:', len(res))
    except Exception as e:
        traceback.print_exc()
        
    from repositories.enterprise.branch import branch_repo
    print('count_staff:', branch_repo.count_staff(db, branch.id))
else:
    print('Not found')
