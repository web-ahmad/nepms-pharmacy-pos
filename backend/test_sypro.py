"""
Diagnostic script: Fetch Sypro medicine from DB and inspect all key fields.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.inventory import Medicine
from models.packaging import PackagingLevel

db = SessionLocal()
try:
    med = db.query(Medicine).filter(Medicine.name.ilike('%sypro%')).first()
    if not med:
        print("Medicine 'Sypro' NOT FOUND in database!")
        sys.exit(1)

    print(f"Medicine: {med.name}")
    print(f"  id:                    {med.id}")
    print(f"  generic_name:          {med.generic_name}")
    print(f"  manufacturer:          {med.manufacturer}")
    print(f"  category_id:           {med.category_id}")
    print(f"  dosage_form:           {med.dosage_form}")
    print(f"  strips_per_box:        {med.strips_per_box}")
    print(f"  units_per_strip:       {med.units_per_strip}")
    print(f"  strength:              {med.strength}")
    print(f"  barcode:               {med.barcode}")
    print(f"  sku:                   {med.sku}")
    print(f"  cost_per_base_unit:    {med.cost_per_base_unit}")
    print(f"  margin_percent:        {med.margin_percent}")
    print(f"  mrp:                   {med.mrp}")
    print(f"  min_stock_level:       {med.min_stock_level}")
    print(f"  max_stock_level:       {med.max_stock_level}")
    print(f"  shelf:                 {med.shelf}")
    print(f"  is_active:             {med.is_active}")

    print()
    print("  Packaging Levels:")
    pkgs = db.query(PackagingLevel).filter(PackagingLevel.medicine_id == med.id).all()
    if not pkgs:
        print("    (none)")
    for p in pkgs:
        print(f"    - {p.level_name}: conversion_qty={p.conversion_qty}, sale_price={p.sale_price}, "
              f"is_purchase_unit={p.is_purchase_unit}, is_smallest_unit={p.is_smallest_unit}, "
              f"is_default_pos_unit={p.is_default_pos_unit}")
finally:
    db.close()
