import sys
import traceback
sys.path.append('c:/Users/DEVJiX/Desktop/NEPMS/backend')
from core.database import SessionLocal
from services.dashboard_service import get_charts_data

db = SessionLocal()
try:
    # Assuming Wasif or tenant_id
    res = get_charts_data(db, tenant_id="some_tenant", branch_id=None, cashier_id=None, from_date="2026-07-16", to_date="2026-07-16")
    print("Success")
except Exception as e:
    print(f"Exception: {str(e)}")
    traceback.print_exc()
