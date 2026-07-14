from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil

from database import get_db
from core.deps import get_current_user
from models.users import User
from schemas.prescription import PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse, PaginatedPrescriptionResponse
from services.prescription_service import PrescriptionService
from dependencies.module_guard import require_module
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter(dependencies=[Depends(require_module("digital_rx"))])

@router.get("", response_model=PaginatedPrescriptionResponse)
def get_prescriptions(
    patient_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.view" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = PrescriptionService(db)
    return service.get_prescriptions(patient_id=patient_id, skip=skip, limit=limit)

@router.get("/customer/{customer_id}", response_model=PaginatedPrescriptionResponse)
def get_customer_prescriptions(
    customer_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.view" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    service = PrescriptionService(db)
    return service.get_prescriptions(patient_id=customer_id, skip=skip, limit=limit)

@router.get("/{id}", response_model=PrescriptionResponse)
def get_prescription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.view" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    service = PrescriptionService(db)
    return service.get_prescription(id)

@router.post("", response_model=PrescriptionResponse)
def create_prescription(
    prescription_in: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.create" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    service = PrescriptionService(db)
    return service.create_prescription(prescription_in, tenant_id=scope.tenant_id, current_user_id=current_user.id)

@router.put("/{id}", response_model=PrescriptionResponse)
def update_prescription(
    id: str,
    prescription_in: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.update" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    service = PrescriptionService(db)
    return service.update_prescription(id, prescription_in, current_user_id=current_user.id)

@router.delete("/{id}")
def delete_prescription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.delete" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    service = PrescriptionService(db)
    service.delete_prescription(id, current_user_id=current_user.id)
    return {"message": "Prescription deleted successfully"}

@router.post("/upload")
def upload_prescription_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.lower() if current_user.role else ""
    if "prescription.create" not in current_user.permissions and "*" not in current_user.permissions and role_name != "owner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Create uploads directory if not exists
    upload_dir = "uploads/prescriptions"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "filename": unique_filename,
        "url": f"/api/v1/uploads/prescriptions/{unique_filename}",
        "message": "File uploaded successfully"
    }

@router.get("/{id}/history")
def get_prescription_history(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # This is a placeholder since history/audit logging is a requirement.
    # A real implementation would query an audit_logs table.
    return [
        {
            "date": "2023-10-01T10:00:00Z",
            "action": "Created",
            "user": "System",
            "details": "Prescription created."
        }
    ]
