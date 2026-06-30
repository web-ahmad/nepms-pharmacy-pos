from sqlalchemy.orm import Session
from models.system import Notification, BackupHistory, OCRQueue
from schemas.system import NotificationCreate, BackupHistoryCreate, OCRQueueCreate

class SystemRepository:
    def __init__(self, db: Session):
        self.db = db

    # Notifications
    def get_notifications(self, tenant_id: str, user_id: str = None):
        q = self.db.query(Notification).filter(Notification.tenant_id == tenant_id)
        if user_id:
            q = q.filter((Notification.user_id == user_id) | (Notification.user_id == None))
        return q.order_by(Notification.created_at.desc()).limit(100).all()

    def create_notification(self, tenant_id: str, obj_in: NotificationCreate):
        db_obj = Notification(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def mark_notification_read(self, tenant_id: str, notif_id: str):
        db_obj = self.db.query(Notification).filter(Notification.tenant_id == tenant_id, Notification.id == notif_id).first()
        if db_obj:
            db_obj.is_read = True
            self.db.commit()
            self.db.refresh(db_obj)
        return db_obj

    # Backups
    def get_backups(self, tenant_id: str):
        return self.db.query(BackupHistory).filter(BackupHistory.tenant_id == tenant_id).order_by(BackupHistory.created_at.desc()).all()

    def create_backup_record(self, tenant_id: str, user_id: str, obj_in: BackupHistoryCreate):
        db_obj = BackupHistory(tenant_id=tenant_id, created_by=user_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # OCR
    def get_ocr_queue(self, tenant_id: str):
        return self.db.query(OCRQueue).filter(OCRQueue.tenant_id == tenant_id).order_by(OCRQueue.created_at.desc()).all()

    def enqueue_ocr(self, tenant_id: str, obj_in: OCRQueueCreate):
        db_obj = OCRQueue(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
