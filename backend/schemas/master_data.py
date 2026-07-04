from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MasterDataBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    status: Optional[str] = "Active"

class MasterDataCreate(MasterDataBase):
    pass

class MasterDataUpdate(MasterDataBase):
    name: Optional[str] = None

class MasterDataResponse(MasterDataBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Extended for Master Tax Rule
class MasterTaxRuleCreate(MasterDataCreate):
    rate: str

class MasterTaxRuleResponse(MasterDataResponse):
    rate: str

# Extended for Master Supplier
class MasterSupplierCreate(MasterDataCreate):
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class MasterSupplierResponse(MasterDataResponse):
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
