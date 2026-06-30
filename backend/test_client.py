import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Login
login_data = {'username': 'owner', 'password': 'Demo@123'}
res_login = client.post('/api/v1/auth/login', json=login_data)
print("Login status:", res_login.status_code)
if res_login.status_code != 200:
    print("Login response:", res_login.text)
    sys.exit()

token = res_login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

payload = {
    "name": "Panadol Dynamic Box Client Test",
    "generic_name": "Paracetamol",
    "brand_name": "Panadol",
    "manufacturer": "GSK",
    "category": "Analgesic",
    "barcode": "5000200010044",
    "reorder_level": 15,
    "max_stock_level": 150,
    "is_active": True,
    
    "packaging_unit": "Box",
    "units_per_pack": 120,
    "strips_per_box": 12,
    "units_per_strip": 10,
    "volume_weight": None,
    "shelf": "Shelf B-2",

    "purchase_price": 1.50,
    "sale_price": 2.50,
    "mrp": 3.00,
    "tax_rate": 5.0,
    "is_controlled": False
}

try:
    res_create = client.post('/api/v1/inventory/medicines', json=payload, headers=headers)
    print("Create status:", res_create.status_code)
    print("Create response:", res_create.text)
except Exception as e:
    import traceback
    traceback.print_exc()
