from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.audit import AuditLog
from models.users import User
from schemas.reports import DateRangeParams, ReportResponse
from schemas.audit import SystemAuditLogResponse
from typing import List, Optional

from datetime import datetime

class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def get_audit_logs(
        self, 
        tenant_id: str, 
        params: DateRangeParams, 
        entity_types: Optional[List[str]] = None,
        severity: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[SystemAuditLogResponse]:
        
        query = self.db.query(AuditLog, User).outerjoin(User, AuditLog.user_id == User.id).filter(AuditLog.tenant_id == tenant_id)
        
        query = query.filter(
            AuditLog.created_at >= datetime.combine(params.start_date, datetime.min.time()),
            AuditLog.created_at <= datetime.combine(params.end_date, datetime.max.time())
        )
        
        if entity_types:
            query = query.filter(AuditLog.entity_type.in_(entity_types))
            
        if severity:
            query = query.filter(AuditLog.severity == severity)
            
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
            
        results = query.order_by(desc(AuditLog.created_at)).limit(1000).all()
        
        responses = []
        for log, user in results:
            responses.append(SystemAuditLogResponse(
                id=log.id,
                tenant_id=log.tenant_id,
                branch_id=log.branch_id,
                user_id=log.user_id,
                user_name=user.name if user else "System",
                created_at=log.created_at,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                previous_value=log.previous_value,
                new_value=log.new_value,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                reason_code=log.reason_code,
                batch_audit_id=log.batch_audit_id,
                severity=log.severity,
                details=None
            ))
            
        return responses
