import sys, os, json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Exact payload that comes from mapFormToBackend() in medicine.api.ts
backend_payload = {
    # Basic Info (same field names)
    "name": "Panadol Extra 500mg",
    "brand_name": "Panadol",
    "generic_name": "Paracetamol",
    "manufacturer": "GlaxoSmithKline",
    "country_of_origin": "Pakistan",
    "dosage_form": "Tablet",
    "base_unit": "Tablet",
    "strength": "500",
    "description": "Pain reliever and fever reducer",
    "status": "Active",
    # is_active mapped from status
    "is_active": True,
    # Pricing — purchase_price → cost_per_base_unit
    "cost_per_base_unit": 3.5,
    "discount_percentage": 5,          # purchase_discount_percent
    "margin_percent": 20,
    "wholesale_margin_percent": 10,
    "mrp": 5.0,
    "tax_rate": 0,
    "tax_inclusive": False,
    # Inventory
    "min_stock_level": 50,
    "max_stock_level": 1000,
    "reorder_level": 100,
    "shelf": "A-3",
    # Flags
    "rx_required": False,
    "is_controlled": False,
    "is_otc": True,
    "is_antibiotic": False,
    "narcotic": False,
    "cold_chain": False,
    "protect_from_light": False,
    "keep_dry": False,
    "hazardous": False,
    # Packaging levels
    "packaging_levels": [
        {
            "level_name": "Tablet",
            "conversion_qty": 1,
            "is_smallest_unit": True,
            "is_sale_unit": True,
            "is_purchase_unit": False,
            "is_default_pos_unit": True,
            "sale_price": 5.0
        },
        {
            "level_name": "Strip",
            "conversion_qty": 10,
            "is_smallest_unit": False,
            "is_sale_unit": True,
            "is_purchase_unit": False,
            "is_default_pos_unit": False,
            "sale_price": 45.0
        },
        {
            "level_name": "Box",
            "conversion_qty": 100,
            "is_smallest_unit": False,
            "is_sale_unit": True,
            "is_purchase_unit": True,
            "is_default_pos_unit": False,
            "sale_price": 420.0
        }
    ],
    # Initial batch
    "initial_batch": {
        "batch_number": "BTH-2025-001",
        "manufacturing_date": "2025-01-01",
        "expiry_date": "2027-06-30",
        "current_stock": 500,
        "mrp": 5.0
    }
}

response = client.post("/api/v1/medicines", json=backend_payload)
print(f"Status Code: {response.status_code}")
try:
    data = response.json()
    print(json.dumps(data, indent=2, default=str))
except Exception:
    print(response.text)
