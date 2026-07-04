from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Child models for deeply nested creation
class MedicinePackagingCreate(BaseModel):
    packaging_level: int
    master_packaging_id: str
    quantity: float
    barcode: Optional[str] = None
    is_default_sale_unit: Optional[bool] = False
    is_default_purchase_unit: Optional[bool] = False

class MedicineConversionRuleCreate(BaseModel):
    from_packaging_level: int # Instead of ID, we might use index to relate to the packaging array created above
    to_packaging_level: int
    conversion_factor: float

class MedicinePricingCreate(BaseModel):
    purchase_price: float = 0.0
    margin_percent: float = 0.0
    markup_percent: float = 0.0
    cost_price: float = 0.0
    retail_price: float = 0.0
    wholesale_price: float = 0.0
    distributor_price: float = 0.0
    hospital_price: float = 0.0
    mrp: float = 0.0

class MedicineSupplierMappingCreate(BaseModel):
    supplier_id: str
    priority: int = 1
    lead_time_days: int = 0
    minimum_order_qty: float = 1.0
    is_default: bool = False
    supplier_product_code: Optional[str] = None
    supplier_notes: Optional[str] = None

class MedicineBarcodeCreate(BaseModel):
    barcode: str
    barcode_type: str = "EAN-13"
    # we can map to packaging by level
    packaging_level: Optional[int] = None

class MedicineCustomFieldCreate(BaseModel):
    field_name: str
    field_value: Optional[str] = None

# Main Medicine Creation Model
class MedicineMasterCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    
    generic_id: Optional[str] = None
    brand_id: Optional[str] = None
    manufacturer_id: Optional[str] = None
    category_id: Optional[str] = None
    dosage_form_id: Optional[str] = None
    strength_id: Optional[str] = None
    strength_unit_id: Optional[str] = None
    route_id: Optional[str] = None
    prescription_type_id: Optional[str] = None
    storage_condition_id: Optional[str] = None
    tax_rule_id: Optional[str] = None
    
    medicine_type: Optional[str] = None
    status: Optional[str] = "Active"
    image_url: Optional[str] = None
    dynamic_fields: Dict[str, Any] = {}
    
    packaging: List[MedicinePackagingCreate] = []
    conversion_rules: List[MedicineConversionRuleCreate] = []
    pricing: Optional[MedicinePricingCreate] = None
    suppliers: List[MedicineSupplierMappingCreate] = []
    barcodes: List[MedicineBarcodeCreate] = []
    custom_fields: List[MedicineCustomFieldCreate] = []

# Response Model (simplified for now, usually would include full nested response)
class MedicineMasterResponse(BaseModel):
    id: str
    name: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
