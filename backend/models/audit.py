from sqlalchemy import Column, String, ForeignKey, Text, JSON, Boolean
from models.base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    
    user_id = Column(String(36), ForeignKey("users.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    
    # Medicine Creation, Medicine Updates, Price Changes, Batch Creation, Batch Modifications, Stock Adjustments
    action = Column(String(100), nullable=False, index=True) 
    
    entity_type = Column(String(100), nullable=False) # e.g., 'Medicine', 'Batch'
    entity_id = Column(String(100), nullable=False)
    
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    
    ip_address = Column(String(50))
    user_agent = Column(Text)
    
    reason_code = Column(String(100), nullable=True)
    batch_audit_id = Column(String(36), nullable=True, index=True)
    severity = Column(String(20), default="Info") # Info, Warning, Critical
    
    media_urls = Column(JSON, nullable=True) # {"webcam": "...", "screenshot": "..."}
    whatsapp_alert_sent = Column(Boolean, default=False)
