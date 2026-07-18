from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil

from database import get_db
from core.deps import get_current_user, requires_permission
from models.users import User
from schemas.prescription import PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse, PaginatedPrescriptionResponse
from services.prescription_service import PrescriptionService
from dependencies.module_guard import require_module
from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope

router = APIRouter(dependencies=[Depends(require_module("digital_rx"))])

# ── Permission guards ─────────────────────────────────────────────────────────
# No role-name comparisons. All checks use requires_permission("module:action").
_rx_view   = requires_permission("prescriptions:view")
_rx_create = requires_permission("prescriptions:create")
_rx_edit   = requires_permission("prescriptions:edit")
_rx_delete = requires_permission("prescriptions:delete")


@router.get("", response_model=PaginatedPrescriptionResponse)
def get_prescriptions(
    patient_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    return service.get_prescriptions(patient_id=patient_id, skip=skip, limit=limit)


@router.get("/customer/{customer_id}", response_model=PaginatedPrescriptionResponse)
def get_customer_prescriptions(
    customer_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    return service.get_prescriptions(patient_id=customer_id, skip=skip, limit=limit)


@router.get("/{id}", response_model=PrescriptionResponse)
def get_prescription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    return service.get_prescription(id)


@router.post("", response_model=PrescriptionResponse)
def create_prescription(
    prescription_in: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_create),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    return service.create_prescription(
        prescription_in,
        tenant_id=scope.tenant_id,
        current_user_id=current_user.id,
    )


@router.put("/{id}", response_model=PrescriptionResponse)
def update_prescription(
    id: str,
    prescription_in: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_edit),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    return service.update_prescription(id, prescription_in, current_user_id=current_user.id)


@router.delete("/{id}")
def delete_prescription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_delete),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    service.delete_prescription(id, current_user_id=current_user.id)
    return {"message": "Prescription deleted successfully"}


@router.post("/upload")
def upload_prescription_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_create),
):
    upload_dir = "uploads/prescriptions"
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": unique_filename,
        "url": f"/api/v1/uploads/prescriptions/{unique_filename}",
        "message": "File uploaded successfully",
    }


@router.get("/{id}/history")
def get_prescription_history(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: dict = Depends(_rx_view),
    scope: PharmacyScope = Depends(get_pharmacy_scope),
):
    service = PrescriptionService(db)
    return service.get_prescription_history(id)
