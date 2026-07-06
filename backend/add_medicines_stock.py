import os
import sys
from datetime import datetime, timedelta
import random
import uuid

# Setup paths for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.inventory import Medicine, Batch
from models.users import Tenant

def seed_medicines():
    db = SessionLocal()

    # Ensure a tenant exists (use the first available one)
    tenant = db.query(Tenant).first()
    tenant_id = tenant.id if tenant else "tenant-" + str(uuid.uuid4())[:8]
    
    if not tenant:
        tenant = Tenant(id=tenant_id, name="Test Tenant", subdomain="test")
        db.add(tenant)
        db.commit()

    medicines_data = [
        {
            "name": "Panadol 500mg",
            "generic_name": "Paracetamol",
            "brand_name": "Panadol",
            "manufacturer": "GSK",
            "formula": "C8H9NO2",
            "strength": "500mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 2.5,
            "mrp": 3.0,
            "unit_retail_price": 3.0,
            "min_stock_level": 500,
            "is_otc": True,
            "season_type": "ALL-SEASON",
            "category_name": "Pain Relief",
            "shelf": "A1"
        },
        {
            "name": "Augmentin 625mg",
            "generic_name": "Amoxicillin + Clavulanic Acid",
            "brand_name": "Augmentin",
            "manufacturer": "GSK",
            "formula": "Amoxicillin Trihydrate",
            "strength": "625mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 25.0,
            "mrp": 30.0,
            "unit_retail_price": 30.0,
            "min_stock_level": 100,
            "is_antibiotic": True,
            "rx_required": True,
            "season_type": "WINTER",
            "category_name": "Antibiotics",
            "shelf": "B2"
        },
        {
            "name": "Arinac Forte",
            "generic_name": "Ibuprofen + Pseudoephedrine",
            "brand_name": "Arinac",
            "manufacturer": "Abbott",
            "formula": "Ibuprofen 400mg + Pseudoephedrine 60mg",
            "strength": "400mg/60mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 5.0,
            "mrp": 6.5,
            "unit_retail_price": 6.5,
            "min_stock_level": 200,
            "is_otc": False,
            "season_type": "WINTER",
            "category_name": "Cold & Flu",
            "shelf": "C1"
        },
        {
            "name": "Brufen 400mg",
            "generic_name": "Ibuprofen",
            "brand_name": "Brufen",
            "manufacturer": "Abbott",
            "formula": "Ibuprofen",
            "strength": "400mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 3.0,
            "mrp": 4.0,
            "unit_retail_price": 4.0,
            "min_stock_level": 300,
            "is_otc": True,
            "season_type": "ALL-SEASON",
            "category_name": "Pain Relief",
            "shelf": "A2"
        },
        {
            "name": "Flagyl 400mg",
            "generic_name": "Metronidazole",
            "brand_name": "Flagyl",
            "manufacturer": "Sanofi",
            "formula": "Metronidazole",
            "strength": "400mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 4.0,
            "mrp": 5.0,
            "unit_retail_price": 5.0,
            "min_stock_level": 150,
            "is_antibiotic": True,
            "rx_required": True,
            "season_type": "SUMMER",
            "category_name": "Antibiotics",
            "shelf": "B3"
        },
        {
            "name": "Gaviscon Syrup",
            "generic_name": "Sodium Alginate + Potassium Bicarbonate",
            "brand_name": "Gaviscon",
            "manufacturer": "Reckitt Benckiser",
            "formula": "Sodium Alginate",
            "strength": "120ml",
            "dosage_form": "Syrup",
            "base_unit": "Bottle",
            "cost_per_base_unit": 120.0,
            "mrp": 150.0,
            "unit_retail_price": 150.0,
            "min_stock_level": 50,
            "is_otc": True,
            "season_type": "ALL-SEASON",
            "category_name": "Antacids",
            "shelf": "D1"
        },
        {
            "name": "Zyrtec 10mg",
            "generic_name": "Cetirizine",
            "brand_name": "Zyrtec",
            "manufacturer": "GSK",
            "formula": "Cetirizine Hydrochloride",
            "strength": "10mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 8.0,
            "mrp": 10.0,
            "unit_retail_price": 10.0,
            "min_stock_level": 100,
            "is_otc": True,
            "season_type": "SUMMER",
            "category_name": "Antihistamines",
            "shelf": "E1"
        },
        {
            "name": "Ponstan Forte 500mg",
            "generic_name": "Mefenamic Acid",
            "brand_name": "Ponstan",
            "manufacturer": "Pfizer",
            "formula": "Mefenamic Acid",
            "strength": "500mg",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 4.5,
            "mrp": 6.0,
            "unit_retail_price": 6.0,
            "min_stock_level": 200,
            "is_otc": True,
            "season_type": "ALL-SEASON",
            "category_name": "Pain Relief",
            "shelf": "A3"
        },
        {
            "name": "Calpol Suspension",
            "generic_name": "Paracetamol",
            "brand_name": "Calpol",
            "manufacturer": "GSK",
            "formula": "Paracetamol",
            "strength": "120mg/5ml",
            "dosage_form": "Syrup",
            "base_unit": "Bottle",
            "cost_per_base_unit": 80.0,
            "mrp": 100.0,
            "unit_retail_price": 100.0,
            "min_stock_level": 60,
            "is_otc": True,
            "season_type": "ALL-SEASON",
            "category_name": "Pediatric",
            "shelf": "D2"
        },
        {
            "name": "Surbex Z",
            "generic_name": "Multivitamins + Zinc",
            "brand_name": "Surbex Z",
            "manufacturer": "Abbott",
            "formula": "Vitamins + Zinc",
            "strength": "High Potency",
            "dosage_form": "Tablet",
            "base_unit": "Tablet",
            "cost_per_base_unit": 12.0,
            "mrp": 15.0,
            "unit_retail_price": 15.0,
            "min_stock_level": 100,
            "is_otc": True,
            "season_type": "ALL-SEASON",
            "category_name": "Vitamins",
            "shelf": "F1"
        }
    ]

    for data in medicines_data:
        # Check if medicine already exists to avoid duplicates
        existing_med = db.query(Medicine).filter(Medicine.name == data["name"]).first()
        if not existing_med:
            med_id = str(uuid.uuid4())
            med = Medicine(
                id=med_id,
                name=data["name"],
                generic_name=data["generic_name"],
                brand_name=data["brand_name"],
                manufacturer=data["manufacturer"],
                formula=data["formula"],
                strength=data["strength"],
                dosage_form=data["dosage_form"],
                base_unit=data["base_unit"],
                cost_per_base_unit=data["cost_per_base_unit"],
                mrp=data["mrp"],
                unit_retail_price=data["unit_retail_price"],
                min_stock_level=data["min_stock_level"],
                is_otc=data.get("is_otc", False),
                is_antibiotic=data.get("is_antibiotic", False),
                rx_required=data.get("rx_required", False),
                season_type=data["season_type"],
                shelf=data["shelf"],
                tenant_id=tenant_id
            )
            db.add(med)
            
            # Create 1 or 2 batches for this medicine
            today = datetime.now()
            for _ in range(random.randint(1, 2)):
                batch_id = str(uuid.uuid4())
                days_to_expiry = random.randint(30, 730)
                batch = Batch(
                    id=batch_id,
                    medicine_id=med_id,
                    batch_number=f"B-{random.randint(1000,9999)}",
                    manufacturing_date=today - timedelta(days=random.randint(10, 300)),
                    expiry_date=today + timedelta(days=days_to_expiry),
                    initial_quantity=500,
                    current_quantity=500,
                    purchase_price=data["cost_per_base_unit"],
                    unit_selling_price=data["unit_retail_price"],
                    mrp=data["mrp"],
                    tenant_id=tenant_id
                )
                db.add(batch)

    db.commit()
    db.close()
    print("10 realistic medicines and their stock batches added successfully!")

if __name__ == "__main__":
    seed_medicines()
