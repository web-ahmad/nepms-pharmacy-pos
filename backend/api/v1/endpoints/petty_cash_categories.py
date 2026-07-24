from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import uuid

from database import get_db
from dependencies.auth import get_current_user
from models.users import User
from models.expenses import PettyCashCategory
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

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
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    query = db.query(PettyCashCategory).filter(PettyCashCategory.tenant_id == scope.tenant_id)
    # Branch-isolated: only the active branch's categories (or the whole tenant's
    # in "All Branches" mode, where scope.branch_id is None).
    if scope.branch_id:
        query = query.filter(PettyCashCategory.branch_id == scope.branch_id)
    return query.all()

@router.post("", response_model=PettyCashCategoryResponse)
@router.post("/", response_model=PettyCashCategoryResponse)
def create_category(
    data: PettyCashCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    # A category belongs to a specific branch — branch_id comes from the active
    # X-Branch-Id (scope), never the client payload.
    if not scope.branch_id:
        raise HTTPException(status_code=400, detail="Select a specific branch before adding a category.")

    # Duplicate check scoped to THIS branch — same name may exist in another branch.
    existing = db.query(PettyCashCategory).filter(
        PettyCashCategory.tenant_id == scope.tenant_id,
        PettyCashCategory.branch_id == scope.branch_id,
        PettyCashCategory.name == data.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{data.name} already exists in this branch.")

    cat = PettyCashCategory(
        id=str(uuid.uuid4()),
        tenant_id=scope.tenant_id,
        branch_id=scope.branch_id,
        name=data.name
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/{id}")
def delete_category(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    cat = db.query(PettyCashCategory).filter(
        PettyCashCategory.id == id,
        PettyCashCategory.tenant_id == scope.tenant_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(cat)
    db.commit()
    return {"message": "Deleted successfully"}
