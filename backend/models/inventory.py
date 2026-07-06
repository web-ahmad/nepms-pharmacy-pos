from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, Date, Table
from sqlalchemy.orm import relationship
from typing import Optional
from .base import BaseModel
from sqlalchemy import DateTime

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
    country_of_origin = Column(String(100))
    category_id = Column(String(36), ForeignKey("categories.id"))
    
    formula = Column(Text)
    strength = Column(String(100))
    dosage_form = Column(String(100))
    strips_per_box = Column(Integer, nullable=True)
    units_per_strip = Column(Integer, nullable=True)
    volume_weight = Column(String(100), nullable=True)
    
    # Base Unit replaces flat packaging
    base_unit = Column(String(100), nullable=False, default="Tablet") 
    
    drap_registration_no = Column(String(100), nullable=True)
    rx_required = Column(Boolean, default=False)
    is_controlled = Column(Boolean, default=False)
    
    barcode = Column(String(255), unique=True, index=True)
    
    cost_per_base_unit = Column(Float, default=0.0)
    margin_percent = Column(Float, default=0.0)
    mrp = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    
    min_stock_level = Column(Integer, default=0)
    max_stock_level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    shelf = Column(String(100), nullable=True)
    last_location = Column(String(100), nullable=True)
    
    therapeutic_class = Column(String(100))
    sku = Column(String(100), unique=True, index=True)
    
    trade_price = Column(Float, default=0.0)
    discount_percentage = Column(Float, default=0.0)
    tax_category = Column(String(100))
    tax_type = Column(String(50))
    tax_inclusive = Column(Boolean, default=False)
    hs_code = Column(String(50))
    drug_schedule = Column(String(100))
    storage_conditions = Column(String(100))
    temp_condition = Column(String(100))
    protect_from_light = Column(Boolean, default=False)
    keep_dry = Column(Boolean, default=False)
    hazardous = Column(Boolean, default=False)
    
    is_otc = Column(Boolean, default=False)
    is_antibiotic = Column(Boolean, default=False)
    narcotic = Column(Boolean, default=False)
    cold_chain = Column(Boolean, default=False)
    age_restriction = Column(Integer, nullable=True)
    
    description = Column(Text)
    search_keywords = Column(Text)
    slug = Column(String(255), unique=True, index=True)
    internal_product_code = Column(String(100), unique=True, index=True)
    qr_code = Column(Text)
    
    image_url = Column(String(500))
    status = Column(String(50), default="Active")
    unit_retail_price = Column(Float, default=0.0)
    season_type = Column(String(50), nullable=True) # SUMMER, WINTER, MONSOON, ALL-SEASON
    
    batches = relationship("Batch", back_populates="medicine")
    packaging_levels = relationship("PackagingLevel", back_populates="medicine", cascade="all, delete-orphan")
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
        return self.total_quantity * (self.cost_per_base_unit or 0.0)

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
    
    purchase_price = Column(Float, default=0.0)
    unit_selling_price = Column(Float, nullable=True)
    current_quantity = Column(Integer, default=0)
    expiry_date = Column(Date, nullable=False)
    supplier_id = Column(String(36), ForeignKey("suppliers.id"))
    purchase_invoice_id = Column(String(100)) # Optional link to a purchase invoice
    mrp = Column(Float, nullable=True)
    
    initial_quantity = Column(Integer, nullable=False) # Base Units
    current_quantity = Column(Integer, default=0) # Base Units
    reserved_quantity = Column(Integer, default=0) # Base Units
    
    cost_per_base_unit = Column(Float, nullable=True) # Override default medicine cost for this batch
    
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
        return self.medicine.unit_retail_price if self.medicine else 0.0
    
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

class AuditSession(BaseModel):
    __tablename__ = "audit_sessions"
    
    tenant_id = Column(String(36), ForeignKey("tenants.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    created_by = Column(String(36), ForeignKey("users.id"))
    
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="Draft") # Draft, In Progress, Under Review, Completed
    scope_type = Column(String(50)) # Category, Location, All
    scope_value = Column(String(255))
    is_blind = Column(Boolean, default=False)
    
    start_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    
    notes = Column(Text, nullable=True)
    
    items = relationship("AuditItem", back_populates="session", cascade="all, delete-orphan")

class AuditItem(BaseModel):
    __tablename__ = "audit_items"
    
    session_id = Column(String(36), ForeignKey("audit_sessions.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=True)
    
    system_quantity = Column(Integer, default=0)
    physical_count = Column(Integer, nullable=True)
    variance = Column(Integer, nullable=True)
    unit_price = Column(Float, default=0.0) 
    
    session = relationship("AuditSession", back_populates="items")
    medicine = relationship("Medicine")
    batch = relationship("Batch")
