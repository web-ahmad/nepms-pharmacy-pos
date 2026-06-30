from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories.system import SystemRepository
from schemas.system import NotificationCreate, BackupHistoryCreate, OCRQueueCreate

class SystemService:
    def __init__(self, db: Session):
        self.repo = SystemRepository(db)
        self.db = db

    def get_notifications(self, tenant_id: str, user_id: str = None):
        return self.repo.get_notifications(tenant_id, user_id)

    def create_notification(self, tenant_id: str, obj_in: NotificationCreate):
        return self.repo.create_notification(tenant_id, obj_in)

    def mark_notification_read(self, tenant_id: str, notif_id: str):
        return self.repo.mark_notification_read(tenant_id, notif_id)

    def get_backups(self, tenant_id: str):
        return self.repo.get_backups(tenant_id)

    def trigger_backup(self, tenant_id: str, user_id: str):
        # In a real system, this would trigger an async job (e.g. pg_dump to S3)
        # Here we simulate the record creation
        import time
        obj_in = BackupHistoryCreate(
            file_name=f"backup_{tenant_id}_{int(time.time())}.sql.gz",
            size_mb=42.5,
            status="Success"
        )
        backup = self.repo.create_backup_record(tenant_id, user_id, obj_in)
        
        from models.audit import AuditLog
        self.db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action="System Backup",
            entity_type="System",
            entity_id=backup.id,
            details="Triggered manual database backup"
        ))
        self.db.commit()
        return backup

    def get_ocr_queue(self, tenant_id: str):
        return self.repo.get_ocr_queue(tenant_id)

    def enqueue_ocr_job(self, tenant_id: str, obj_in: OCRQueueCreate):
        return self.repo.enqueue_ocr(tenant_id, obj_in)
        
    def get_system_health(self):
        # Simulated health metrics
        return {
            "database_status": "Healthy",
            "active_connections": 14,
            "storage_used_gb": 42.5,
            "storage_total_gb": 500.0,
            "cpu_usage_percent": 12.4,
            "memory_usage_percent": 45.8,
            "queues_pending": 0
        }
