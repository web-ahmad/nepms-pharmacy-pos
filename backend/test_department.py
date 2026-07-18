import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.hr import Department
from schemas.hr import DepartmentCreate
from services.hr_service import HRService

db = SessionLocal()
try:
    svc = HRService(db)
    obj = DepartmentCreate(name="Test Dept", description="", head_id=None, is_active=True)
    svc.create_department("tenant1", obj)
    print("Success")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
