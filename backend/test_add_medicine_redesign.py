import requests
import json
import uuid

BASE = "http://localhost:8000/api/v1"

def get_auth_token():
    login_data = {"username": "owner", "password": "Demo@123"}
    r = requests.post(f"{BASE}/auth/login", json=login_data)
    if r.status_code == 200:
        return r.json()["access_token"]
    return None

token = get_auth_token()
if not token:
    print("Could not get auth token")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

payload = {
    "name": f"Syrup {uuid.uuid4().hex[:4]}",
    "generic_name": "Paracetamol",
    "category": "Syrups", # USING category INSTEAD OF category_id
    "manufacturer": "GSK",
    "strength": "120mg/5ml",
    "dosage_form": "Syrup",
    "mrp": 200,
    "tax_rate": 0,
    "min_stock_level": 10,
    "max_stock_level": 50,
    "status": "Active",
    "is_controlled": False,
    "base_unit": "ml",
    "is_active": True,
    "cost_per_base_unit": 0.8,
    "margin_percent": 15,
    "initial_batch": {
        "batch_number": "BATCH-100",
        "manufacturing_date": "2023-01-01",
        "expiry_date": "2026-12-31",
        "current_stock": 50
    },
    "packaging_levels": [
        {
            "level_name": "ml",
            "conversion_qty": 1,
            "is_smallest_unit": True,
            "is_sale_unit": True,
            "is_purchase_unit": False,
            "is_default_pos_unit": True,
            "sale_price": 1.2
        },
        {
            "level_name": "Bottle",
            "conversion_qty": 120,
            "is_smallest_unit": False,
            "is_sale_unit": True,
            "is_purchase_unit": True,
            "is_default_pos_unit": False,
            "sale_price": 144
        }
    ]
}

print(f"Sending payload: {json.dumps(payload, indent=2)}")

r = requests.post(f"{BASE}/inventory/medicines", json=payload, headers=headers)

if r.status_code == 200:
    print("\nSUCCESS! Medicine created.")
else:
    print(f"\nFAILED! Status: {r.status_code}")
    print(r.text)
