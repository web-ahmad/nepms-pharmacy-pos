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

    def mark_all_notifications_read(self, tenant_id: str, user_id: str = None):
        q = self.db.query(Notification).filter(Notification.tenant_id == tenant_id, Notification.is_read == False)
        if user_id:
            q = q.filter((Notification.user_id == user_id) | (Notification.user_id == None))
        
        q.update({"is_read": True}, synchronize_session=False)
        self.db.commit()
        return True

    def delete_notification(self, tenant_id: str, notif_id: str):
        db_obj = self.db.query(Notification).filter(Notification.tenant_id == tenant_id, Notification.id == notif_id).first()
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()
        return True

    def clear_all_notifications(self, tenant_id: str, user_id: str = None):
        q = self.db.query(Notification).filter(Notification.tenant_id == tenant_id)
        if user_id:
            q = q.filter((Notification.user_id == user_id) | (Notification.user_id == None))
        
        q.delete(synchronize_session=False)
        self.db.commit()
        return True

    def seed_mock_notifications(self, tenant_id: str, user_id: str):
        import random
        from datetime import datetime, timedelta
        import uuid

        categories = ['System', 'Inventory', 'Pharmacy', 'Billing', 'Payroll']
        messages = [
            ("Low Stock Alert", "Panadol 500mg stock is critically low. Only 5 units left.", "Inventory"),
            ("System Update", "NEPMS has been updated to v2.1. Please refresh your browser.", "System"),
            ("Payroll Processed", "Salary for the month of July has been processed successfully.", "Payroll"),
            ("New Prescription", "A new prescription has been submitted by Dr. Ali.", "Pharmacy"),
            ("Payment Received", "Payment of Rs 1500 received for Invoice #1024.", "Billing"),
            ("License Expiry Warning", "Your Pharmacy License will expire in 30 days. Please renew.", "Pharmacy"),
            ("Daily Sales Report", "Today's sales have crossed Rs 50,000. Good job!", "Billing"),
        ]

        now = datetime.utcnow()
        for i in range(10):
            msg = random.choice(messages)
            notif = Notification(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                user_id=user_id,
                title=msg[0],
                message=msg[1],
                category=msg[2],
                is_read=random.choice([True, False, False]), # More unread
                created_at=now - timedelta(hours=random.randint(1, 48))
            )
            self.db.add(notif)
        
        self.db.commit()
        return True

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
