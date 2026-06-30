from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, Date, Table
from sqlalchemy.orm import relationship
from typing import Optional
from .base import BaseModel

medicine_substitutes = Table(
    "medicine_substitutes",
    BaseModel.metadata,
    Column("medicine_id", String(36), ForeignKey("medicines.id"), primary_key=True),
    Column("substitute_id", String(36), ForeignKey("medicines.id"), primary_key=True)
)

class Category(BaseModel):
    __tablename__ = "categories"
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(String(36), ForeignKey("categories.id"), nullable=True)

class Medicine(BaseModel):
    __tablename__ = "medicines"

    name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), index=True)
    brand_name = Column(String(255))
    manufacturer = Column(String(255))
    category_id = Column(String(36), ForeignKey("categories.id"))
    
    formula = Column(Text)
    strength = Column(String(100))
    dosage_form = Column(String(100))
    packaging_unit = Column(String(100))
    units_per_pack = Column(Integer, default=1)
    
    is_controlled = Column(Boolean, default=False)
    barcode = Column(String(255), unique=True, index=True)
    
    purchase_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    mrp = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    
    min_stock_level = Column(Integer, default=0)
    max_stock_level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    shelf = Column(String(100), nullable=True)
    strips_per_box = Column(Integer, nullable=True)
    units_per_strip = Column(Integer, nullable=True)
    volume_weight = Column(String(100), nullable=True)
    
    therapeutic_class = Column(String(100))
    sku = Column(String(100), unique=True, index=True)
    uom = Column(String(50))
    trade_price = Column(Float, default=0.0)
    discount_percentage = Column(Float, default=0.0)
    tax_category = Column(String(100))
    drug_schedule = Column(String(100))
    storage_conditions = Column(String(100))
    image_url = Column(String(500))
    status = Column(String(50), default="Active")
    unit_retail_price = Column(Float, default=0.0)
    
    batches = relationship("Batch", back_populates="medicine")
    category_rel = relationship("Category", foreign_keys=[category_id])
    
    substitutes = relationship(
        "Medicine",
        secondary=medicine_substitutes,
        primaryjoin="Medicine.id==medicine_substitutes.c.medicine_id",
        secondaryjoin="Medicine.id==medicine_substitutes.c.substitute_id",
        backref="substituted_by"
    )
    
    @property
    def total_quantity(self) -> int:
        return sum(
            batch.available_quantity 
            for batch in self.batches 
            if batch.status == "Active" and not getattr(batch, 'is_deleted', False)
        )

    @property
    def stock_value(self) -> float:
        return self.total_quantity * (self.purchase_price or 0.0)

    @property
    def reorder_level(self) -> int:
        return self.min_stock_level or 0

    @reorder_level.setter
    def reorder_level(self, value: int):
        self.min_stock_level = value

    @property
    def category(self) -> Optional[str]:
        return self.category_rel.name if self.category_rel else None

    @category.setter
    def category(self, value: Optional[str]):
        pass

class Batch(BaseModel):
    __tablename__ = "batches"

    batch_number = Column(String(100), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    branch_id = Column(String(36), ForeignKey("branches.id")) # stock is branch specific
    
    manufacturing_date = Column(Date)
    expiry_date = Column(Date, nullable=False, index=True)
    
    purchase_price = Column(Float, default=0.0)
    unit_selling_price = Column(Float, nullable=True)
    current_quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    supplier_id = Column(String(36), ForeignKey("suppliers.id"), nullable=True)
    
    # Active, Near Expiry, Expired, Recalled, Damaged, Quarantined
    status = Column(String(50), default="Active") 
    
    medicine = relationship("Medicine", back_populates="batches")
    supplier = relationship("Supplier")
    
    @property
    def available_quantity(self):
        return self.current_quantity - self.reserved_quantity

    @property
    def selling_price(self) -> float:
        if self.unit_selling_price is not None:
            return self.unit_selling_price
        return self.medicine.sale_price if self.medicine else 0.0
    
class StockAdjustment(BaseModel):
    __tablename__ = "stock_adjustments"

    batch_id = Column(String(36), ForeignKey("batches.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    
    quantity_adjusted = Column(Integer, nullable=False) # positive or negative
    reason = Column(String(255))
    notes = Column(Text)

class StockMovement(BaseModel):
    __tablename__ = "stock_movements"
    
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    
    # Movement Types: Purchase, Sale, Sale Return, Purchase Return, Adjustment Increase, Adjustment Decrease, Transfer In, Transfer Out, Expiry, Damage
    movement_type = Column(String(100), nullable=False, index=True)
    
    quantity_change = Column(Integer, nullable=False) # Positive or Negative
    balance_after = Column(Integer, nullable=False)
    
    reference_id = Column(String(100), index=True) # ID of Sale, GRN, Adjustment, etc.
    notes = Column(Text)
    
    medicine = relationship("Medicine")
    batch = relationship("Batch")

    @property
    def quantity(self) -> int:
        return self.quantity_change
