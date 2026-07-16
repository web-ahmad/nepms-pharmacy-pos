from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel

class ReportTemplate(BaseModel):
    __tablename__ = 'report_templates'

    tenant_id = Column(String(36), ForeignKey('tenants.id'), nullable=False)
    branch_id = Column(String(36), ForeignKey('branches.id'), nullable=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    
    name = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False) # e.g., 'sales', 'inventory'
    is_public = Column(Boolean, default=False)
    
    # Store filters, grouping, sorting, selected columns, chart types in a JSON payload
    configuration = Column(JSON, default=dict)
    
    user = relationship("User", foreign_keys=[user_id])
    branch = relationship("Branch", foreign_keys=[branch_id])

class ReportExecutionHistory(BaseModel):
    __tablename__ = 'report_execution_history'
    
    tenant_id = Column(String(36), ForeignKey('tenants.id'), nullable=False)
    branch_id = Column(String(36), ForeignKey('branches.id'), nullable=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=True) # Who scheduled it
    
    report_name = Column(String(255), nullable=False)
    schedule_id = Column(String(36), nullable=True) # Optional link to alert_config
    
    execution_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    execution_end = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, default=0)
    
    status = Column(String(50), nullable=False, default='pending') # pending, success, failed
    error_message = Column(Text, nullable=True)
    export_format = Column(String(50), nullable=True) # pdf, excel, csv, etc.
    
    user = relationship("User", foreign_keys=[user_id])
    branch = relationship("Branch", foreign_keys=[branch_id])
