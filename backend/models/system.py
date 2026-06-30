from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Text
from datetime import datetime
import uuid
from database import Base

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Null if broadcast/tenant-wide
    title = Column(String)
    message = Column(Text)
    category = Column(String) # Inventory, Payroll, System, CRM
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class BackupHistory(Base):
    __tablename__ = "backup_history"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    file_name = Column(String)
    size_mb = Column(Float)
    status = Column(String) # Success, Failed, In_Progress
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class OCRQueue(Base):
    __tablename__ = "ocr_queues"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), index=True)
    file_path = Column(String)
    status = Column(String, default="Pending") # Pending, Processing, Completed, Failed
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
