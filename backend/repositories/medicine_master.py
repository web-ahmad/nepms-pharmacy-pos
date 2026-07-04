from sqlalchemy.orm import Session
from sqlalchemy.future import select
from models.medicine_master import (
    MedicineMaster, MedicinePackaging, MedicineConversionRule,
    MedicinePricing, MedicineSupplierMapping, MedicineBarcode,
    MedicineCustomField
)
from schemas.medicine_master import MedicineMasterCreate
from .base import CRUDBase

class MedicineMasterRepository(CRUDBase):
    def __init__(self):
        super().__init__(MedicineMaster)

    def create_medicine_with_details(self, db: Session, data: MedicineMasterCreate) -> MedicineMaster:
        # Create core medicine
        medicine_data = data.model_dump(exclude={
            "packaging", "conversion_rules", "pricing", 
            "suppliers", "barcodes", "custom_fields"
        })
        db_medicine = MedicineMaster(**medicine_data)
        db.add(db_medicine)
        db.flush() # get ID

        # Packaging
        db_packages = []
        for pkg_data in data.packaging:
            db_pkg = MedicinePackaging(medicine_id=db_medicine.id, **pkg_data.model_dump())
            db.add(db_pkg)
            db_packages.append(db_pkg)
        
        db.flush() # get pkg IDs

        # Conversion Rules (Assume indices relate to db_packages list)
        for rule_data in data.conversion_rules:
            from_pkg_id = db_packages[rule_data.from_packaging_level].id if rule_data.from_packaging_level < len(db_packages) else None
            to_pkg_id = db_packages[rule_data.to_packaging_level].id if rule_data.to_packaging_level < len(db_packages) else None
            if from_pkg_id and to_pkg_id:
                db_rule = MedicineConversionRule(
                    medicine_id=db_medicine.id,
                    from_packaging_id=from_pkg_id,
                    to_packaging_id=to_pkg_id,
                    conversion_factor=rule_data.conversion_factor
                )
                db.add(db_rule)

        # Pricing
        if data.pricing:
            db_pricing = MedicinePricing(medicine_id=db_medicine.id, **data.pricing.model_dump())
            db.add(db_pricing)

        # Suppliers
        for sup_data in data.suppliers:
            db_sup = MedicineSupplierMapping(medicine_id=db_medicine.id, **sup_data.model_dump())
            db.add(db_sup)

        # Barcodes
        for bc_data in data.barcodes:
            pkg_id = db_packages[bc_data.packaging_level].id if bc_data.packaging_level is not None and bc_data.packaging_level < len(db_packages) else None
            db_bc = MedicineBarcode(
                medicine_id=db_medicine.id,
                barcode=bc_data.barcode,
                barcode_type=bc_data.barcode_type,
                packaging_id=pkg_id
            )
            db.add(db_bc)

        # Custom Fields
        for cf_data in data.custom_fields:
            db_cf = MedicineCustomField(medicine_id=db_medicine.id, **cf_data.model_dump())
            db.add(db_cf)

        db.commit()
        db.refresh(db_medicine)
        return db_medicine
