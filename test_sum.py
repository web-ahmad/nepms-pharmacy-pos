import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from models.inventory import Batch
from sqlalchemy import func

db = SessionLocal()

val = db.query(
    func.sum(Batch.current_quantity).label("stock_val"),
    func.sum(Batch.reserved_quantity).label("res_val")
).filter(Batch.id == 'nonexistent').first()

print("val:", val)
print("val is None:", val is None)
if val is not None:
    print("val.stock_val:", val.stock_val)
