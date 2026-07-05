"""
Test script: verify unique fields with empty string don't cause UNIQUE constraint errors.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas.inventory import MedicineUpdate

UNIQUE_FIELDS = ['sku', 'barcode', 'slug', 'internal_product_code', 'qr_code']

print("Testing that unique fields accept empty strings (coerced to None)...")
print("=" * 60)

for field in UNIQUE_FIELDS:
    try:
        m = MedicineUpdate(**{field: ''})
        val = getattr(m, field)
        if val is None:
            print(f"  OK  {field} = '' -> None (safe for UNIQUE constraint)")
        else:
            print(f"  WARN {field} = '' -> '{val}' (still a string - may fail!)")
    except Exception as e:
        print(f"  FAIL {field} -> {e}")

print()
print("Testing numeric fields with empty string...")
print("=" * 60)
NUMERIC_INT_FIELDS = ['strips_per_box', 'units_per_strip', 'min_stock_level', 'max_stock_level', 'reorder_level', 'age_restriction']
for field in NUMERIC_INT_FIELDS:
    try:
        m = MedicineUpdate(**{field: ''})
        val = getattr(m, field)
        print(f"  OK  {field} = '' -> {repr(val)}")
    except Exception as e:
        print(f"  FAIL {field} -> {e}")

print("\nDone.")
