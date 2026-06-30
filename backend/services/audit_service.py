from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.audit import AuditLog
from schemas.reports import DateRangeParams, ReportResponse
from services.export_service import ExportService

class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def _handle_response(self, title: str, headers: list, rows: list, export_format: str = None) -> any:
        if export_format:
            return ExportService.dispatch_export(export_format, title, headers, rows)
        
        return ReportResponse(
            title=title,
            headers=headers,
            rows=rows,
            total_records=len(rows)
        )

    def get_audit_logs(self, tenant_id: str, params: DateRangeParams, entity_type: str = None):
        query = self.db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)
        
        # We assume start_date and end_date are dates, timestamp is datetime
        query = query.filter(
            AuditLog.timestamp >= params.start_date,
            # using less than strictly the next day could be safer, but this works for basic filtering
            AuditLog.timestamp <= params.end_date
        )
        
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
            
        logs = query.order_by(desc(AuditLog.timestamp)).limit(1000).all() # Limit to 1000 for safety
        
        rows = []
        for log in logs:
            rows.append({
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": log.user_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details
            })
            
        headers = ["timestamp", "user_id", "action", "entity_type", "entity_id", "details"]
        title = f"Audit Log ({entity_type})" if entity_type else "Full Audit Log"
        return self._handle_response(title, headers, rows, params.export_format)

    def get_security_audit(self, tenant_id: str, params: DateRangeParams):
        return self.get_audit_logs(tenant_id, params, entity_type="User")

    def get_inventory_audit(self, tenant_id: str, params: DateRangeParams):
        return self.get_audit_logs(tenant_id, params, entity_type="Inventory")
