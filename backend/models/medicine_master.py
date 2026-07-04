from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel

class MedicineMaster(BaseModel):
    __tablename__ = "medicine_master"

    # Core details
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    
    # Relationships to Masters
    generic_id = Column(String(36), ForeignKey("master_generics.id"), nullable=True)
    brand_id = Column(String(36), ForeignKey("master_brands.id"), nullable=True)
    manufacturer_id = Column(String(36), ForeignKey("master_manufacturers.id"), nullable=True)
    category_id = Column(String(36), ForeignKey("master_categories.id"), nullable=True)
    dosage_form_id = Column(String(36), ForeignKey("master_dosage_forms.id"), nullable=True)
    
    strength_id = Column(String(36), ForeignKey("master_strengths.id"), nullable=True)
    strength_unit_id = Column(String(36), ForeignKey("master_strength_units.id"), nullable=True)
    route_id = Column(String(36), ForeignKey("master_routes.id"), nullable=True)
    prescription_type_id = Column(String(36), ForeignKey("master_prescription_types.id"), nullable=True)
    storage_condition_id = Column(String(36), ForeignKey("master_storage_conditions.id"), nullable=True)
    tax_rule_id = Column(String(36), ForeignKey("master_tax_rules.id"), nullable=True)
    
    medicine_type = Column(String(100)) # e.g., Allopathic, Homeopathic
    status = Column(String(50), default="Active")

    # Image
    image_url = Column(String(500))

    # Strict rule: NO inventory, NO stock quantities, NO purchase invoices here!
    
    # Dynamic form fields (can store extra data in JSON for dynamic fields based on dosage form)
    dynamic_fields = Column(JSON, default={})

class MedicineTemplate(BaseModel):
    __tablename__ = "medicine_templates"
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    dosage_form_id = Column(String(36), ForeignKey("master_dosage_forms.id"), nullable=True)
    template_data = Column(JSON, default={})

class MedicinePackaging(BaseModel):
    __tablename__ = "medicine_packaging"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"), index=True)
    packaging_level = Column(Integer, default=1) # 1 = Base (Tablet), 2 = Strip, 3 = Box
    master_packaging_id = Column(String(36), ForeignKey("master_packaging.id"))
    quantity = Column(Float, default=1.0)
    barcode = Column(String(255))
    is_default_sale_unit = Column(Boolean, default=False)
    is_default_purchase_unit = Column(Boolean, default=False)

class MedicineConversionRule(BaseModel):
    __tablename__ = "medicine_conversion_rules"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"), index=True)
    from_packaging_id = Column(String(36), ForeignKey("medicine_packaging.id"))
    to_packaging_id = Column(String(36), ForeignKey("medicine_packaging.id"))
    conversion_factor = Column(Float, nullable=False) # e.g. 1 Box = 10 Strips

class MedicinePricing(BaseModel):
    __tablename__ = "medicine_pricing"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"), unique=True)
    purchase_price = Column(Float, default=0.0)
    margin_percent = Column(Float, default=0.0)
    markup_percent = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    retail_price = Column(Float, default=0.0)
    wholesale_price = Column(Float, default=0.0)
    distributor_price = Column(Float, default=0.0)
    hospital_price = Column(Float, default=0.0)
    mrp = Column(Float, default=0.0)

class MedicineSupplierMapping(BaseModel):
    __tablename__ = "medicine_supplier_mapping"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    supplier_id = Column(String(36), ForeignKey("master_suppliers.id"))
    priority = Column(Integer, default=1)
    lead_time_days = Column(Integer, default=0)
    minimum_order_qty = Column(Float, default=1.0)
    is_default = Column(Boolean, default=False)
    supplier_product_code = Column(String(100))
    supplier_notes = Column(Text)

class MedicineBarcode(BaseModel):
    __tablename__ = "medicine_barcodes"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    packaging_id = Column(String(36), ForeignKey("medicine_packaging.id"), nullable=True)
    barcode = Column(String(255), nullable=False, unique=True, index=True)
    barcode_type = Column(String(50), default="EAN-13")

class MedicineImage(BaseModel):
    __tablename__ = "medicine_images"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    alt_text = Column(String(255))

class MedicineDocument(BaseModel):
    __tablename__ = "medicine_documents"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    title = Column(String(255))
    url = Column(String(500), nullable=False)
    document_type = Column(String(100)) # e.g. Leaflet, Certificate

class MedicineAuditLog(BaseModel):
    __tablename__ = "medicine_audit_logs"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    user_id = Column(String(36)) # Could be FK to users
    action = Column(String(100)) # Create, Update, Delete
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    reason = Column(Text)
    ip_address = Column(String(50))

class MedicineVersion(BaseModel):
    __tablename__ = "medicine_versions"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    version_number = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=False)

class MedicineCustomField(BaseModel):
    __tablename__ = "medicine_custom_fields"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text)

class MedicineAiTag(BaseModel):
    __tablename__ = "medicine_ai_tags"
    medicine_id = Column(String(36), ForeignKey("medicine_master.id", ondelete="CASCADE"))
    tag = Column(String(100), nullable=False, index=True)
    confidence_score = Column(Float, default=1.0)
