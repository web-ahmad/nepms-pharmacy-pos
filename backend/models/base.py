import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Boolean, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class BaseModel(Base):
    __abstract__ = True

    # Use string-based UUID for cross-database compatibility (SQLite + Postgres)
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)

    # ── Multi-tenancy ─────────────────────────────────────────────────────────
    # Legacy scoping key (kept for backward compat)
    tenant_id = Column(String(36), index=True, nullable=True)
    # SaaS pharmacy scoping key — every row belongs to exactly one pharmacy
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id"), index=True, nullable=True)

    # Standard tracking fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Soft delete flag
    is_deleted = Column(Boolean, default=False, index=True)

    # For sync conflict resolution
    sync_version = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
