from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Notification
class NotificationBase(BaseModel):
    title: str
    message: str
    category: str

class NotificationCreate(NotificationBase):
    user_id: Optional[str] = None

class NotificationResponse(NotificationBase):
    id: str
    user_id: Optional[str] = None
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Backup
class BackupHistoryBase(BaseModel):
    file_name: str
    size_mb: float
    status: str

class BackupHistoryCreate(BackupHistoryBase):
    pass

class BackupHistoryResponse(BackupHistoryBase):
    id: str
    created_by: str
    created_at: datetime
    class Config:
        from_attributes = True

# OCR
class OCRQueueBase(BaseModel):
    file_path: str

class OCRQueueCreate(OCRQueueBase):
    pass

class OCRQueueResponse(OCRQueueBase):
    id: str
    status: str
    extracted_text: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    class Config:
        from_attributes = True
        
# System Stats
class SystemHealthResponse(BaseModel):
    database_status: str
    active_connections: int
    storage_used_gb: float
    storage_total_gb: float
    cpu_usage_percent: float
    memory_usage_percent: float
    queues_pending: int
