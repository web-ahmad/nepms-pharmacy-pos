from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import date, datetime

class PaginatedResponse(BaseModel):
    total: int
    items: List[Any]
    model_config = ConfigDict(from_attributes=True)

# Category
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

class InitialBatch(BaseModel):
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    supplier_id: Optional[str] = None
    current_stock: int

# Medicine
class MedicineBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    manufacturer: Optional[str] = None
    category_id: Optional[str] = None
    category: Optional[str] = None
    formula: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    packaging_unit: Optional[str] = None
    units_per_pack: int = 1
    is_controlled: bool = False
    barcode: Optional[str] = None
    purchase_price: float = 0.0
    sale_price: float = 0.0
    mrp: float = 0.0
    tax_rate: float = 0.0
    min_stock_level: int = 0
    max_stock_level: int = 0
    reorder_level: Optional[int] = None
    is_active: bool = True
    shelf: Optional[str] = None
    strips_per_box: Optional[int] = None
    units_per_strip: Optional[int] = None
    volume_weight: Optional[str] = None
    therapeutic_class: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None
    trade_price: float = 0.0
    discount_percentage: float = 0.0
    tax_category: Optional[str] = None
    drug_schedule: Optional[str] = None
    storage_conditions: Optional[str] = None
    image_url: Optional[str] = None
    status: str = "Active"
    unit_retail_price: float = 0.0

class MedicineCreate(MedicineBase):
    initial_batch: Optional[InitialBatch] = None
    substitute_ids: Optional[List[str]] = None

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    manufacturer: Optional[str] = None
    category_id: Optional[str] = None
    category: Optional[str] = None
    formula: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    packaging_unit: Optional[str] = None
    units_per_pack: Optional[int] = None
    is_controlled: Optional[bool] = None
    barcode: Optional[str] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    mrp: Optional[float] = None
    tax_rate: Optional[float] = None
    min_stock_level: Optional[int] = None
    max_stock_level: Optional[int] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None
    shelf: Optional[str] = None
    strips_per_box: Optional[int] = None
    units_per_strip: Optional[int] = None
    volume_weight: Optional[str] = None
    therapeutic_class: Optional[str] = None
    sku: Optional[str] = None
    uom: Optional[str] = None
    trade_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    tax_category: Optional[str] = None
    drug_schedule: Optional[str] = None
    storage_conditions: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None
    unit_retail_price: Optional[float] = None
    substitute_ids: Optional[List[str]] = None

# Batch
class BatchBase(BaseModel):
    batch_number: str
    medicine_id: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    purchase_price: float = 0.0
    current_quantity: int = 0
    reserved_quantity: int = 0
    supplier_id: Optional[str] = None
    status: str = "Active"

class BatchCreate(BatchBase):
    branch_id: Optional[str] = None

class BatchResponse(BatchBase):
    id: str
    branch_id: Optional[str] = None
    available_quantity: int
    selling_price: float = 0.0
    model_config = ConfigDict(from_attributes=True)

class MedicineResponse(MedicineBase):
    id: str
    tenant_id: Optional[str] = None
    total_quantity: int = 0
    stock_value: float = 0.0
    batches: Optional[List[BatchResponse]] = []
    model_config = ConfigDict(from_attributes=True)


# Stock Movement
class StockMovementResponse(BaseModel):
    id: str
    medicine_id: str
    batch_id: str
    branch_id: str
    user_id: str
    movement_type: str
    quantity_change: int
    quantity: int = 0
    balance_after: int
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StockAdjustmentPayload(BaseModel):
    medicine_id: str
    batch_id: str
    adjustment_type: str
    quantity: int
    reason: str

class LowStockAlert(BaseModel):
    medicine_id: str
    medicine_name: str
    generic_name: Optional[str] = None
    batch_info: Optional[str] = None
    current_stock: int
    min_stock_level: int
    safety_threshold: int
    suggested_reorder: int
    supplier_name: Optional[str] = None
    supplier_id: Optional[str] = None
    category_name: Optional[str] = None
    severity: str

class PaginatedLowStockResponse(BaseModel):
    total: int
    items: List[LowStockAlert]
    page: int
    size: int
    model_config = ConfigDict(from_attributes=True)

class ExpiryAlert(BaseModel):
    batch_id: str
    batch_number: str
    medicine_name: str
    expiry_date: date
    days_to_expiry: int
    current_quantity: int
    inventory_value: float
