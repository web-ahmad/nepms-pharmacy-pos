import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.inventory import Medicine
from sqlalchemy.orm import joinedload
from schemas.inventory import MedicineResponse

db = SessionLocal()
try:
    items = db.query(Medicine).options(joinedload(Medicine.batches), joinedload(Medicine.packaging_levels)).all()
    print(f"Found {len(items)} medicines")
    for item in items:
        try:
            resp = MedicineResponse.model_validate(item)
            print(f"Validated {item.id}")
        except Exception as e:
            print(f"Error validating {item.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            break
finally:
    db.close()
