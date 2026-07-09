from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.audit import AuditLog
from models.users import User
from schemas.reports import DateRangeParams, ReportResponse
from schemas.audit import SystemAuditLogResponse
from typing import List, Optional

from datetime import datetime

import os
import uuid
import base64

class AuditService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def save_surveillance_media(webcam_b64: str = None, screenshot_b64: str = None) -> dict:
        urls = {}
        storage_dir = os.path.join(os.getcwd(), "storage", "surveillance")
        os.makedirs(storage_dir, exist_ok=True)
        
        try:
            if webcam_b64:
                # Remove header if exists
                if "," in webcam_b64:
                    webcam_b64 = webcam_b64.split(",")[1]
                filename = f"webcam_{uuid.uuid4().hex}.jpg"
                filepath = os.path.join(storage_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(webcam_b64))
                urls["webcam"] = f"/storage/surveillance/{filename}"
                
            if screenshot_b64:
                if "," in screenshot_b64:
                    screenshot_b64 = screenshot_b64.split(",")[1]
                filename = f"screenshot_{uuid.uuid4().hex}.jpg"
                filepath = os.path.join(storage_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(screenshot_b64))
                urls["screenshot"] = f"/storage/surveillance/{filename}"
        except Exception as e:
            print(f"Failed to save surveillance media: {e}")
            
        return urls

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
                user_name=user.full_name if user else "System",
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
                details=None,
                media_urls=log.media_urls,
                whatsapp_alert_sent=log.whatsapp_alert_sent
            ))
            
        return responses
