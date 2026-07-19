from backend.database import SessionLocal
from backend.models.inventory import Medicine, Batch
from sqlalchemy import or_, and_
from sqlalchemy.orm import contains_eager, joinedload

db = SessionLocal()
branch_id = "some-uuid"

query = db.query(Medicine).options(joinedload(Medicine.packaging_levels)).filter(
    Medicine.is_deleted == False
)
query = query.filter(Medicine.batches.any(and_(Batch.branch_id == branch_id, Batch.is_deleted == False)))
query = query.outerjoin(Batch, and_(Batch.medicine_id == Medicine.id, Batch.branch_id == branch_id, Batch.is_deleted == False))
query = query.options(contains_eager(Medicine.batches))

try:
    total = query.count()
    print("Count:", total)
except Exception as e:
    print(f"Error counting: {e}")
