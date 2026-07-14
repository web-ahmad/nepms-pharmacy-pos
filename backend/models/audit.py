import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, Boolean, JSON, ForeignKey
from database import Base


class AuditEvent(Base):
    """Records every suspicious POS action (void, discount, refund, etc.)."""
    __tablename__ = "audit_events"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    branch_id      = Column(String(36), nullable=False, index=True)
    staff_id       = Column(String(36), nullable=False, index=True)
    event_type     = Column(String(50), nullable=False, index=True)
    transaction_id = Column(String(36), nullable=True)
    metadata_      = Column("metadata", JSON, default={})
    severity       = Column(String(20), default="medium")  # low / medium / high
    created_at     = Column(DateTime, default=datetime.utcnow, index=True)
    # SaaS pharmacy scope
    pharmacy_id    = Column(String(36), ForeignKey("pharmacies.id"), index=True, nullable=True)


class AlertHistory(Base):
    """Tracks every WhatsApp/dashboard notification attempt."""
    __tablename__ = "alert_history"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_event_id = Column(String(36), nullable=True, index=True)
    sent_to        = Column(String(100), nullable=False)
    channel        = Column(String(50), nullable=False)   # whatsapp / dashboard
    status         = Column(String(50), nullable=False)   # sent / failed / pending
    error_message  = Column(Text, nullable=True)
    sent_at        = Column(DateTime, default=datetime.utcnow, index=True)
    # SaaS pharmacy scope
    pharmacy_id    = Column(String(36), ForeignKey("pharmacies.id"), index=True, nullable=True)


class CameraSnapshot(Base):
    """Stores the URL of an image captured at the time of an audit event."""
    __tablename__ = "camera_snapshots"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    audit_event_id = Column(String(36), nullable=False, index=True)
    branch_id      = Column(String(36), nullable=False)
    camera_id      = Column(String(100), default="LAPTOP_CAM")
    image_url      = Column(Text, nullable=False)
    captured_at    = Column(DateTime, default=datetime.utcnow)
    # SaaS pharmacy scope
    pharmacy_id    = Column(String(36), ForeignKey("pharmacies.id"), index=True, nullable=True)


class AlertConfig(Base):
    """Per-branch, per-event configuration for alert thresholds and channels."""
    __tablename__ = "alert_config"

    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    branch_id       = Column(String(36), nullable=False, index=True)
    owner_id        = Column(String(36), nullable=False)
    event_type      = Column(String(50), nullable=False)
    is_enabled      = Column(Boolean, default=True)
    threshold_value = Column(Float, nullable=True)
    notify_via      = Column(String(20), default="whatsapp")  # whatsapp / dashboard / both
    # SaaS pharmacy scope
    pharmacy_id     = Column(String(36), ForeignKey("pharmacies.id"), index=True, nullable=True)


class WhatsAppBotLog(Base):
    """Logs every incoming WhatsApp bot command and its response."""
    __tablename__ = "whatsapp_bot_log"

    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender      = Column(String(50), nullable=False, index=True)   # e.g. 923144236077
    command     = Column(Text, nullable=False)                      # raw incoming text
    report_type = Column(String(100), nullable=True)                # resolved report name
    reply_text  = Column(Text, nullable=True)                       # what we sent back
    status      = Column(String(20), default="ok")                  # ok / ignored / error
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)
    # SaaS pharmacy scope
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id"), index=True, nullable=True)

