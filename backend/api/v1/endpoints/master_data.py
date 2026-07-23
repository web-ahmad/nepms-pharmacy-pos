from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any

from database import get_db
from core.deps import get_current_user
from models.users import User
from repositories.master_data import get_master_repo
from schemas.master_data import MasterDataCreate, MasterDataUpdate, MasterDataResponse
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter(prefix="/master-data", tags=["Master Data"])

# A dictionary mapping frontend keys to backend Model names
MASTER_TYPE_MAPPING = {
    "generics": "MasterGeneric",
    "brands": "MasterBrand",
    "categories": "MasterCategory",
    "manufacturers": "MasterManufacturer",
    "dosage_forms": "MasterDosageForm",
    "strengths": "MasterStrength",
    "strength_units": "MasterStrengthUnit",
    "routes": "MasterRoute",
    "storage_conditions": "MasterStorageCondition",
    "tax_rules": "MasterTaxRule",
    "packaging": "MasterPackaging",
    "units": "MasterUnit",
    "prescription_types": "MasterPrescriptionType",
    "flavors": "MasterFlavor",
    "age_groups": "MasterAgeGroup",
    "suppliers": "MasterSupplier",
    "warehouses": "MasterWarehouse",
    "racks": "MasterRack",
    "shelves": "MasterShelf",
    "bins": "MasterBin"
}

@router.get("/{master_type}", response_model=List[MasterDataResponse])
def get_all_master_data(master_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    model_name = MASTER_TYPE_MAPPING.get(master_type)
    if not model_name:
        raise HTTPException(status_code=400, detail="Invalid master data type")
    
    repo = get_master_repo(model_name)
    return repo.get_all_active(db, tenant_id=current_user.tenant_id)

@router.post("/{master_type}", response_model=MasterDataResponse)
def create_master_data(master_type: str, data: MasterDataCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    model_name = MASTER_TYPE_MAPPING.get(master_type)
    if not model_name:
        raise HTTPException(status_code=400, detail="Invalid master data type")
    
    repo = get_master_repo(model_name)
    # Check duplicate
    existing = repo.get_by_name(db, data.name, tenant_id=current_user.tenant_id)
    if existing:
        return JSONResponse(status_code=400, content={"error": f"{data.name} already exists."})
    
    try:
        return repo.create(db, obj_in=data, tenant_id=current_user.tenant_id)
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=400, content={"error": f"{data.name} already exists."})

@router.delete("/{master_type}/{item_id}")
def delete_master_data(master_type: str, item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    model_name = MASTER_TYPE_MAPPING.get(master_type)
    if not model_name:
        raise HTTPException(status_code=400, detail="Invalid master data type")

    repo = get_master_repo(model_name)
    deleted = repo.remove(db, id=item_id, tenant_id=current_user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Deleted successfully"}
