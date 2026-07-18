import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.hr import Employee

db = SessionLocal()
try:
    employees = db.query(Employee).all()
    print("Success, found", len(employees))
except Exception as e:
    print("Error:", e)
finally:
    db.close()
