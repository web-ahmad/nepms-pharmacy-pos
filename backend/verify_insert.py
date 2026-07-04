from database import SessionLocal
from models.inventory import Medicine
import models.packaging

db = SessionLocal()
med = db.query(Medicine).first()
if med:
    print(f"Medicine: {med.name} (Base Unit: {med.base_unit})")
    print(f"Cost per Base Unit: {med.cost_per_base_unit}")
    print("Packaging Levels:")
    for p in med.packaging_levels:
        print(f" - {p.level_name}: qty={p.conversion_qty}, price={p.sale_price}")
else:
    print("No medicine found.")
db.close()
