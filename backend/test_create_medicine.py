import json
import urllib.request
from datetime import date, timedelta

medicine_data = {
    "name": "Panadol Advance 500mg",
    "generic_name": "Paracetamol",
    "brand_name": "Panadol",
    "manufacturer": "GSK",
    "base_unit": "Tablet",
    "drap_registration_no": "12345",
    "cost_per_base_unit": 2.0, # Rs 2 per tablet
    "margin_percent": 15.0, # 15% margin
    "packaging_levels": [
        {
            "level_name": "Tablet",
            "conversion_qty": 1.0,
            "barcode": "TAB-001",
            "is_purchase_unit": False,
            "is_sale_unit": True,
            "is_default_pos_unit": False,
            "sale_price": 0.0 # Should auto-calculate
        },
        {
            "level_name": "Strip",
            "conversion_qty": 10.0,
            "barcode": "STRIP-001",
            "is_purchase_unit": False,
            "is_sale_unit": True,
            "is_default_pos_unit": True,
            "sale_price": 0.0
        },
        {
            "level_name": "Box",
            "conversion_qty": 100.0,
            "barcode": "BOX-001",
            "is_purchase_unit": True,
            "is_sale_unit": True,
            "is_default_pos_unit": False,
            "sale_price": 0.0
        }
    ],
    "initial_batch": {
        "batch_number": "B-001",
        "expiry_date": (date.today() + timedelta(days=365)).isoformat(),
        "current_stock": 1000 # 1000 Base units (Tablets) = 10 Boxes
    }
}

try:
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/inventory/medicines",
        data=json.dumps(medicine_data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer mock" # Assumes backend auth mocked
        },
        method="POST"
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode("utf-8"))
    print(json.dumps(data, indent=2))
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode("utf-8"))
    else:
        print(e)
