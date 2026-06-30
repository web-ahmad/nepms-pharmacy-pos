from sqlalchemy import Column, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from .base import BaseModel

class Prescription(BaseModel):
    __tablename__ = "prescriptions"

    patient_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    doctor_name = Column(String(255))
    prescription_date = Column(Date)
    valid_until = Column(Date)
    
    diagnosis = Column(String(255))
    image_url = Column(String(500))
    status = Column(String(50), default="Active") # Active, Expired, Fulfilled, Cancelled
    
    notes = Column(Text)

    # Relationships
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")
    patient = relationship("Customer", backref="prescriptions")

class PrescriptionItem(BaseModel):
    __tablename__ = "prescription_items"
    
    prescription_id = Column(String(36), ForeignKey("prescriptions.id"), nullable=False)
    medicine_name = Column(String(255), nullable=False) # Free text or derived from medicine_id
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=True)
    
    dosage = Column(String(100))
    frequency = Column(String(100))
    duration = Column(String(100))
    quantity = Column(String(50)) # e.g. '14 tablets'
    instructions = Column(Text)

    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine")
