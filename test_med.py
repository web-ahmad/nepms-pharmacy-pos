import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from backend.db.session import SessionLocal
from backend.repositories.inventory import medicine_repo
from backend.schemas.inventory import MedicineResponse

db = SessionLocal()
med = medicine_repo.get(db, id="cb1b81a4-76c5-4f00-9c5c-3990f9220b63")
if med:
    try:
        resp = MedicineResponse.model_validate(med)
        resp.purchase_price = 0.0
        print("Success!")
    except Exception as e:
        print(f"Error: {repr(e)}")
else:
    print("Medicine not found")
