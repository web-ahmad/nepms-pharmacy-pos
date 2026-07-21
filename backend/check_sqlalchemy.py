import sys
import os
from datetime import date
sys.path.append(os.getcwd())

from database import SessionLocal
from repositories.reports import ReportsRepository
from schemas.reports import DateRangeParams

db = SessionLocal()
repo = ReportsRepository(db)

params = DateRangeParams(
    start_date=date(2026, 7, 21),
    end_date=date(2026, 7, 21),
    branch_id=None
)

tenant_id = 'fb661464-9d0e-4f9c-a50a-186526545cdd'

res = repo.get_sales_summary(tenant_id, params, 'day')
print("Sales summary:", res)

db.close()
