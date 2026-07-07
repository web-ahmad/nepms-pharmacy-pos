import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from repositories.hr import HRRepository
from schemas.hr import EmployeeResponse

def test_fetch():
    db = SessionLocal()
    try:
        repo = HRRepository(db)
        # assuming tenant_id is "nepms-pharmacy-pos"
        employees = repo.get_employees("test-tenant") 
        print("Fetched", len(employees), "employees")
        # Try to serialize with Pydantic
        for emp in employees:
            res = EmployeeResponse.model_validate(emp)
            print("Successfully validated:", res.first_name)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_fetch()
