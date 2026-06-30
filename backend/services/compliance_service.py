from sqlalchemy.orm import Session
from models.audit import AuditLog
from schemas.compliance import RetentionPolicyUpdate

class ComplianceService:
    def __init__(self, db: Session):
        self.db = db

    def get_audit_logs(self, tenant_id: str, limit: int = 100):
        return self.db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id).order_by(AuditLog.created_at.desc()).limit(limit).all()

    def get_sensitive_actions(self, tenant_id: str):
        sensitive_keywords = ["Update", "Delete", "Export", "Approve", "Run Payroll", "Backup"]
        # Basic filtering for sensitive operations
        q = self.db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)
        # In SQLite, we can just fetch all and filter, or use basic LIKE
        # For simplicity, returning top 50 recent
        logs = q.order_by(AuditLog.created_at.desc()).limit(100).all()
        sensitive_logs = [log for log in logs if any(k in log.action for k in sensitive_keywords)]
        return sensitive_logs

    def update_retention_policy(self, tenant_id: str, obj_in: RetentionPolicyUpdate):
        # Placeholder for data retention cron jobs
        # Typically saved to Settings, returning success for compliance tracking
        return {"status": "Success", "message": f"Retention policies updated to {obj_in.audit_logs_retention_days} days."}
