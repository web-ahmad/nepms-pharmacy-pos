from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories.prescription import PrescriptionRepository
from schemas.prescription import PrescriptionCreate, PrescriptionUpdate
import logging

from models.audit import AuditLog

logger = logging.getLogger(__name__)

class PrescriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.prescription_repo = PrescriptionRepository(db)

    def get_prescriptions(self, patient_id: str = None, skip: int = 0, limit: int = 100):
        total, items = self.prescription_repo.get_all(patient_id=patient_id, skip=skip, limit=limit)
        return {"total": total, "items": items}

    def get_prescription(self, prescription_id: str):
        prescription = self.prescription_repo.get_by_id(prescription_id)
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return prescription

    def create_prescription(self, prescription_in: PrescriptionCreate, tenant_id: str, current_user_id: str = None):
        try:
            db_prescription = self.prescription_repo.create(prescription_in, tenant_id)
            
            if current_user_id:
                audit_log = AuditLog(
                    tenant_id=tenant_id,
                    user_id=current_user_id,
                    action="CREATE",
                    entity_type="Prescription",
                    entity_id=db_prescription.id,
                    new_value={"details": f"Created prescription for patient {db_prescription.patient_id}"}
                )
                self.db.add(audit_log)
                
            self.db.commit()
            return db_prescription
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating prescription: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create prescription: {str(e)}")

    def update_prescription(self, prescription_id: str, prescription_in: PrescriptionUpdate, current_user_id: str = None):
        db_prescription = self.get_prescription(prescription_id)
        try:
            updated_prescription = self.prescription_repo.update(db_prescription, prescription_in)
            
            if current_user_id:
                audit_log = AuditLog(
                    tenant_id=db_prescription.tenant_id,
                    user_id=current_user_id,
                    action="UPDATE",
                    entity_type="Prescription",
                    entity_id=db_prescription.id,
                    new_value={"details": f"Updated prescription for patient {db_prescription.patient_id}"}
                )
                self.db.add(audit_log)
                
            self.db.commit()
            return updated_prescription
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating prescription: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update prescription")

    def delete_prescription(self, prescription_id: str, current_user_id: str = None):
        db_prescription = self.get_prescription(prescription_id)
        try:
            if current_user_id:
                audit_log = AuditLog(
                    tenant_id=db_prescription.tenant_id,
                    user_id=current_user_id,
                    action="DELETE",
                    entity_type="Prescription",
                    entity_id=db_prescription.id,
                    new_value={"details": f"Deleted prescription for patient {db_prescription.patient_id}"}
                )
                self.db.add(audit_log)
                
            self.prescription_repo.delete(db_prescription)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting prescription: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to delete prescription")
