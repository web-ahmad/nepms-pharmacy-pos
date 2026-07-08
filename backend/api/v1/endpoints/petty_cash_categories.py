from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import uuid

from database import get_db
from dependencies.auth import get_current_user
from models.users import User
from models.expenses import PettyCashCategory

router = APIRouter(tags=["Petty Cash Categories"])

class PettyCashCategoryBase(BaseModel):
    name: str

class PettyCashCategoryCreate(PettyCashCategoryBase):
    pass

class PettyCashCategoryResponse(PettyCashCategoryBase):
    id: str

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[PettyCashCategoryResponse])
@router.get("/", response_model=List[PettyCashCategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PettyCashCategory).filter(PettyCashCategory.tenant_id == current_user.tenant_id).all()

@router.post("", response_model=PettyCashCategoryResponse)
@router.post("/", response_model=PettyCashCategoryResponse)
def create_category(
    data: PettyCashCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cat = PettyCashCategory(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        name=data.name
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/{id}")
def delete_category(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(PettyCashCategory).filter(
        PettyCashCategory.id == id,
        PettyCashCategory.tenant_id == current_user.tenant_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(cat)
    db.commit()
    return {"message": "Deleted successfully"}
