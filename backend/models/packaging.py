from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class PackagingLevel(BaseModel):
    __tablename__ = "packaging_levels"

    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    
    level_name = Column(String(100), nullable=False) # e.g., 'Tablet', 'Strip', 'Box', 'Vial', 'ml'
    conversion_qty = Column(Float, nullable=False, default=1.0) # Multiplier of base unit
    
    barcode = Column(String(255), unique=True, index=True, nullable=True)
    secondary_barcode = Column(String(255), unique=True, index=True, nullable=True)
    
    is_purchase_unit = Column(Boolean, default=False)
    is_sale_unit = Column(Boolean, default=True)
    is_smallest_unit = Column(Boolean, default=False)
    is_default_pos_unit = Column(Boolean, default=False)
    
    sale_price = Column(Float, default=0.0) # Auto-calculated or manual override
    
    medicine = relationship("Medicine", back_populates="packaging_levels")
