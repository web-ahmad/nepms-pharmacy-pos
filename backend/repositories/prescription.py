from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from models.prescription import Prescription, PrescriptionItem
from schemas.prescription import PrescriptionCreate, PrescriptionUpdate

class PrescriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, prescription_id: str) -> Optional[Prescription]:
        return self.db.query(Prescription).filter(Prescription.id == prescription_id).first()

    def get_all(self, patient_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> tuple[int, List[Prescription]]:
        query = self.db.query(Prescription)
        if patient_id:
            query = query.filter(Prescription.patient_id == patient_id)
        
        total = query.count()
        items = query.order_by(Prescription.created_at.desc()).offset(skip).limit(limit).all()
        return total, items

    def create(self, prescription: PrescriptionCreate, tenant_id: str) -> Prescription:
        # Separate items from the main model
        prescription_data = prescription.model_dump(exclude={"items"})
        db_prescription = Prescription(
            **prescription_data,
            tenant_id=tenant_id
        )
        self.db.add(db_prescription)
        self.db.flush()

        for item in prescription.items:
            db_item = PrescriptionItem(
                **item.model_dump(),
                prescription_id=db_prescription.id,
                tenant_id=tenant_id
            )
            self.db.add(db_item)
        
        self.db.flush()
        return db_prescription

    def update(self, db_prescription: Prescription, prescription_update: PrescriptionUpdate) -> Prescription:
        update_data = prescription_update.model_dump(exclude_unset=True, exclude={"items"})
        for key, value in update_data.items():
            setattr(db_prescription, key, value)
        
        # Handle items separately if they are provided
        if prescription_update.items is not None:
            # For simplicity, if items are provided, we delete the old ones and add new ones
            self.db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == db_prescription.id).delete()
            for item in prescription_update.items:
                db_item = PrescriptionItem(
                    **item.model_dump(),
                    prescription_id=db_prescription.id,
                    tenant_id=db_prescription.tenant_id
                )
                self.db.add(db_item)
                
        self.db.flush()
        return db_prescription

    def delete(self, db_prescription: Prescription):
        self.db.delete(db_prescription)
        self.db.flush()
