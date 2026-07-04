from sqlalchemy import Column, String, Boolean, Text
from .base import BaseModel

# A unified mixin or base class for all simple master tables
class MasterBaseModel(BaseModel):
    __abstract__ = True
    
    name = Column(String(255), nullable=False, index=True, unique=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Active")

class MasterGeneric(MasterBaseModel):
    __tablename__ = "master_generics"

class MasterBrand(MasterBaseModel):
    __tablename__ = "master_brands"

class MasterCategory(MasterBaseModel):
    __tablename__ = "master_categories"

class MasterManufacturer(MasterBaseModel):
    __tablename__ = "master_manufacturers"

class MasterDosageForm(MasterBaseModel):
    __tablename__ = "master_dosage_forms"

class MasterStrength(MasterBaseModel):
    __tablename__ = "master_strengths"
    
class MasterStrengthUnit(MasterBaseModel):
    __tablename__ = "master_strength_units"

class MasterRoute(MasterBaseModel):
    __tablename__ = "master_routes"

class MasterStorageCondition(MasterBaseModel):
    __tablename__ = "master_storage_conditions"

class MasterTaxRule(MasterBaseModel):
    __tablename__ = "master_tax_rules"
    rate = Column(String(50), default="0") # Can be parsed to float, storing string allows things like '15%' or '0.15' but let's just use it conceptually

class MasterPackaging(MasterBaseModel):
    __tablename__ = "master_packaging"

class MasterUnit(MasterBaseModel):
    __tablename__ = "master_units"

class MasterPrescriptionType(MasterBaseModel):
    __tablename__ = "master_prescription_types"

class MasterFlavor(MasterBaseModel):
    __tablename__ = "master_flavors"

class MasterAgeGroup(MasterBaseModel):
    __tablename__ = "master_age_groups"

class MasterWarehouse(MasterBaseModel):
    __tablename__ = "master_warehouses"

class MasterRack(MasterBaseModel):
    __tablename__ = "master_racks"

class MasterShelf(MasterBaseModel):
    __tablename__ = "master_shelves"

class MasterBin(MasterBaseModel):
    __tablename__ = "master_bins"

# Supplier is already in purchase.py, but user asked for master_suppliers.
# Since it's requested, I'll link the existing suppliers or create a master_supplier if the user specifically wants strict separation,
# but the user said "master_suppliers". Let's create it here and later figure out migration for purchase.py.
class MasterSupplier(MasterBaseModel):
    __tablename__ = "master_suppliers"
    contact_person = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
