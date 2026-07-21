import sys
import os
from datetime import date
sys.path.append(os.getcwd())

from database import SessionLocal
from models.users import User
from schemas.reports import DateRangeParams
from repositories.reports import ReportsRepository

db = SessionLocal()
user = db.query(User).filter(User.username == 'alisaab').first()

repo = ReportsRepository(db)
params = DateRangeParams(
    start_date=date(2026, 7, 21),
    end_date=date(2026, 7, 21),
    branch_id=None
)

# Call get_sales_summary
res = repo.get_sales_summary(user.tenant_id, params, 'day')
print("Direct repo call:", res)
