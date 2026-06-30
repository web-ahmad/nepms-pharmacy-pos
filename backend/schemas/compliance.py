from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class LoginHistoryResponse(BaseModel):
    user_id: str
    login_time: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
class RetentionPolicyUpdate(BaseModel):
    audit_logs_retention_days: int
    system_logs_retention_days: int
