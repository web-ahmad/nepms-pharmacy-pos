from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db
from repositories.medicine_master import MedicineMasterRepository
from schemas.medicine_master import MedicineMasterCreate, MedicineMasterResponse

router = APIRouter(prefix="/medicines", tags=["Medicine Master"])

@router.post("/", response_model=MedicineMasterResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(data: MedicineMasterCreate, db: Session = Depends(get_db)):
    repo = MedicineMasterRepository()
    try:
        medicine = repo.create_medicine_with_details(db, data)
        return medicine
    except Exception as e:
        # Simplistic error handling for now, should catch IntegrityErrors etc.
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[MedicineMasterResponse])
def get_all_medicines(db: Session = Depends(get_db)):
    repo = MedicineMasterRepository()
    return repo.get_all(db)

@router.get("/search", response_model=List[MedicineMasterResponse])
def search_medicines(query: str, db: Session = Depends(get_db)):
    repo = MedicineMasterRepository()
    # Basic search, would ideally integrate AI search or full-text search here
    medicines = db.query(repo.model).filter(repo.model.name.ilike(f"%{query}%")).limit(10).all()
    return medicines
