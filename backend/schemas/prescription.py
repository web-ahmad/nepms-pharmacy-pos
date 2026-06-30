from pydantic import BaseModel, model_validator
from typing import Optional, List, Any
from datetime import date, datetime

class PrescriptionItemBase(BaseModel):
    medicine_name: str
    medicine_id: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[str] = None
    instructions: Optional[str] = None

class PrescriptionItemCreate(PrescriptionItemBase):
    @model_validator(mode='before')
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for k, v in data.items():
                if v == "":
                    data[k] = None
        return data

class PrescriptionItemResponse(PrescriptionItemBase):
    id: str
    prescription_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PrescriptionBase(BaseModel):
    patient_id: str
    doctor_name: Optional[str] = None
    prescription_date: Optional[date] = None
    valid_until: Optional[date] = None
    diagnosis: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "Active"

    @model_validator(mode='before')
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'customer_id' in data and 'patient_id' not in data:
                data['patient_id'] = data.pop('customer_id')
            if 'expiry_date' in data and 'valid_until' not in data:
                data['valid_until'] = data.pop('expiry_date')
        return data

class PrescriptionCreate(PrescriptionBase):
    items: List[PrescriptionItemCreate] = []

class PrescriptionUpdate(BaseModel):
    doctor_name: Optional[str] = None
    prescription_date: Optional[date] = None
    valid_until: Optional[date] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[PrescriptionItemCreate]] = None

    @model_validator(mode='before')
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'expiry_date' in data and 'valid_until' not in data:
                data['valid_until'] = data.pop('expiry_date')
        return data

class PrescriptionResponse(PrescriptionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    items: List[PrescriptionItemResponse]

    class Config:
        from_attributes = True

class PaginatedPrescriptionResponse(BaseModel):
    total: int
    items: List[PrescriptionResponse]
