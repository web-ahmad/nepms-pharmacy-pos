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
        
# System Stats — every field is measured, none simulated.
class SystemHealthResponse(BaseModel):
    database_status: str
    database_engine: str
    database_latency_ms: float
    database_size_mb: float
    disk_total_gb: float
    disk_used_gb: float
    disk_free_gb: float
    disk_used_percent: float
    cpu_cores: int
    uptime_seconds: int
    queues_pending: int
    last_backup_at: Optional[datetime] = None
    last_backup_age_hours: Optional[float] = None
    backup_count: int = 0
    scheduler_active: bool = False
