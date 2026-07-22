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
        """Compute stock value from active batches using purchase_price (preferred) or cost_per_base_unit."""
        total = sum(
            (batch.current_quantity or 0) * (batch.purchase_price or self.cost_per_base_unit or 0.0)
            for batch in self.batches
            if batch.status == "Active" and not getattr(batch, 'is_deleted', False)
        )
        return total

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
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    rack_id = Column(String(36), ForeignKey("warehouse_racks.id"), nullable=True)
    bin_id = Column(String(36), ForeignKey("warehouse_bins.id"), nullable=True)
    
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
    damaged_qty = Column(Integer, default=0)
    quarantine_qty = Column(Integer, default=0)
    in_transit_qty = Column(Integer, default=0)
    last_count_date = Column(DateTime, nullable=True)
    cycle_count_due = Column(Date, nullable=True)
    
    cost_per_base_unit = Column(Float, nullable=True) # Override default medicine cost for this batch
    
    status = Column(String(50), default="Active") 
    
    medicine = relationship("Medicine", back_populates="batches")
    supplier = relationship("Supplier")
    
    @property
    def available_quantity(self):
        return self.current_quantity - self.reserved_quantity - self.damaged_qty - self.quarantine_qty - self.in_transit_qty

    @property
    def selling_price(self) -> float:
        if self.unit_selling_price is not None:
            return self.unit_selling_price
        return self.medicine.unit_retail_price if self.medicine else 0.0
    
class StockAdjustment(BaseModel):
    __tablename__ = "stock_adjustments"

    batch_id = Column(String(36), ForeignKey("batches.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    rack_id = Column(String(36), ForeignKey("warehouse_racks.id"), nullable=True)
    bin_id = Column(String(36), ForeignKey("warehouse_bins.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    
    quantity_adjusted = Column(Integer, nullable=False) # positive or negative
    reason = Column(String(255))
    notes = Column(Text)
    
    approval_status = Column(String(50), default="Approved")
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approval_date = Column(DateTime, nullable=True)

class StockMovement(BaseModel):
    __tablename__ = "stock_movements"
    
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    rack_id = Column(String(36), ForeignKey("warehouse_racks.id"), nullable=True)
    bin_id = Column(String(36), ForeignKey("warehouse_bins.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    
    # Movement Types: Purchase, Sale, Sale Return, Purchase Return, Adjustment Increase, Adjustment Decrease, Transfer In, Transfer Out, Expiry, Damage
    movement_type = Column(String(100), nullable=False, index=True)
    
    quantity_change = Column(Integer, nullable=False) # Positive or Negative
    balance_after = Column(Integer, nullable=False)
    
    reference_id = Column(String(100), index=True) # ID of Sale, GRN, Adjustment, etc.
    reference_branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    reference_transfer_id = Column(String(36), ForeignKey("stock_transfers.id"), nullable=True)
    movement_reason = Column(String(255))
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
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

class WarehouseRack(BaseModel):
    __tablename__ = "warehouse_racks"
    
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

class WarehouseBin(BaseModel):
    __tablename__ = "warehouse_bins"
    
    rack_id = Column(String(36), ForeignKey("warehouse_racks.id"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    max_weight = Column(Float, nullable=True)
    max_volume = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)

class StockTransfer(BaseModel):
    __tablename__ = "stock_transfers"
    
    source_branch_id = Column(String(36), ForeignKey("branches.id"), nullable=False)
    destination_branch_id = Column(String(36), ForeignKey("branches.id"), nullable=False)
    source_warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    destination_warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    
    status = Column(String(50), default="Draft") # Draft, Approved, Packed, Dispatched, In Transit, Partially Received, Received, Cancelled, Rejected
    reference_no = Column(String(100), unique=True, index=True)
    
    requested_by = Column(String(36), ForeignKey("users.id"))
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    dispatched_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    received_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    dispatch_date = Column(DateTime, nullable=True)
    receive_date = Column(DateTime, nullable=True)
    
    notes = Column(Text)
    
    items = relationship("StockTransferItem", back_populates="transfer", cascade="all, delete-orphan")

class StockTransferItem(BaseModel):
    __tablename__ = "stock_transfer_items"
    
    transfer_id = Column(String(36), ForeignKey("stock_transfers.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=True) # Optional until packed
    
    requested_qty = Column(Integer, nullable=False)
    dispatched_qty = Column(Integer, default=0)
    received_qty = Column(Integer, default=0)
    damaged_qty = Column(Integer, default=0)
    
    transfer = relationship("StockTransfer", back_populates="items")
    medicine = relationship("Medicine")
    batch = relationship("Batch")

class InventoryReservation(BaseModel):
    __tablename__ = "inventory_reservations"
    
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"))
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    
    reference_type = Column(String(50)) # e.g., 'Sale', 'Transfer'
    reference_id = Column(String(100))
    
    quantity = Column(Integer, nullable=False)
    status = Column(String(50), default="Active") # Active, Consumed, Released
    
    expires_at = Column(DateTime, nullable=True)

class InventoryCycleCount(BaseModel):
    __tablename__ = "inventory_cycle_counts"
    
    branch_id = Column(String(36), ForeignKey("branches.id"))
    warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    rack_id = Column(String(36), ForeignKey("warehouse_racks.id"), nullable=True)
    
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="Draft") # Draft, In Progress, Review, Completed, Cancelled
    
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"))
    
    start_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    
    notes = Column(Text)
    
    items = relationship("InventoryCycleCountItem", back_populates="cycle_count", cascade="all, delete-orphan")

class InventoryCycleCountItem(BaseModel):
    __tablename__ = "inventory_cycle_count_items"
    
    cycle_count_id = Column(String(36), ForeignKey("inventory_cycle_counts.id"))
    medicine_id = Column(String(36), ForeignKey("medicines.id"))
    batch_id = Column(String(36), ForeignKey("batches.id"))
    bin_id = Column(String(36), ForeignKey("warehouse_bins.id"), nullable=True)
    
    system_qty = Column(Integer, default=0)
    counted_qty = Column(Integer, nullable=True)
    variance_qty = Column(Integer, nullable=True)
    
    reason = Column(String(255))
    
    cycle_count = relationship("InventoryCycleCount", back_populates="items")

from sqlalchemy import select, func
from sqlalchemy.orm import column_property

# Dynamically add current_stock to Medicine to aggregate active batch quantities
Medicine.current_stock = column_property(
    select(func.coalesce(func.sum(Batch.current_quantity), 0))
    .where(
        (Batch.medicine_id == Medicine.id) & 
        (Batch.status == 'Active') & 
        (Batch.is_deleted == False)
    )
    .correlate_except(Batch)
    .scalar_subquery()
)
