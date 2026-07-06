from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class AuditItemBase(BaseModel):
    medicine_id: str
    batch_id: Optional[str] = None
    system_quantity: int
    physical_count: Optional[int] = None
    variance: Optional[int] = None
    unit_price: float = 0.0

class AuditItemCreate(AuditItemBase):
    pass

class AuditItemResponse(AuditItemBase):
    id: str
    medicine_name: str
    sku: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    
    class Config:
        from_attributes = True

class AuditSessionBase(BaseModel):
    name: str
    scope_type: str
    scope_value: str
    is_blind: bool = False
    notes: Optional[str] = None

class AuditSessionCreate(AuditSessionBase):
    pass

class AuditSessionUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class AuditSessionResponse(AuditSessionBase):
    id: str
    status: str
    start_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    created_by: str
    auditor_name: Optional[str] = None
    items: List[AuditItemResponse] = []
    
    class Config:
        from_attributes = True

class UpdatePhysicalCount(BaseModel):
    audit_item_id: str
    physical_count: int

class AuditSummary(BaseModel):
    total_variance_value: float
    total_shrinkage_value: float
    total_surplus_value: float
    matched_items_count: int
    missing_items_count: int
    extra_items_count: int

class SystemAuditLogBase(BaseModel):
    action: str
    entity_type: str
    entity_id: str
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    reason_code: Optional[str] = None
    batch_audit_id: Optional[str] = None
    severity: Optional[str] = "Info"
    details: Optional[str] = None

class SystemAuditLogResponse(SystemAuditLogBase):
    id: str
    tenant_id: str
    branch_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

