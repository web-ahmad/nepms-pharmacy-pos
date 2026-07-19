import sqlite3
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.inventory import Medicine, Batch
from sqlalchemy import or_, and_
from sqlalchemy.orm import contains_eager, joinedload

db = SessionLocal()
tenant_id = "tenant-uuid" # we will just run the query and see if SQLAlchemy raises exception
branch_id = "branch-uuid"

try:
    query = db.query(Medicine).options(joinedload(Medicine.packaging_levels)).filter(
        Medicine.is_deleted == False
    )
    query = query.filter(Medicine.batches.any(and_(Batch.branch_id == branch_id, Batch.is_deleted == False)))
    query = query.outerjoin(Batch, and_(Batch.medicine_id == Medicine.id, Batch.branch_id == branch_id, Batch.is_deleted == False))
    query = query.options(contains_eager(Medicine.batches))
    print(query.limit(10).all())
    print("Success")
except Exception as e:
    print(f"Error: {e}")

