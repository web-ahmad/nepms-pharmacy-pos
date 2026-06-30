import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class BaseModel(Base):
    __abstract__ = True

    # Use string-based UUID for cross-database compatibility (SQLite + Postgres)
    # In a real Postgres-only setup we might use native UUID.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # For multi-tenancy
    tenant_id = Column(String(36), index=True, nullable=True) 

    # Standard tracking fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Soft delete flag
    is_deleted = Column(Boolean, default=False, index=True)
    
    # For sync conflict resolution
    sync_version = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
