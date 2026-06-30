import urllib.request
import urllib.parse
import json
import time

BASE = 'http://127.0.0.1:8000'

def request(path, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE}{path}"
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            return response.status, json.loads(res_data) if res_data else {}
    except urllib.error.HTTPError as e:
        res_data = e.read().decode('utf-8')
        print(f"HTTPError {e.code}: {res_data}")
        return e.code, json.loads(res_data) if res_data else {}

# Login
status, res = request('/api/v1/auth/login', 'POST', {'username': 'owner', 'password': 'Demo@123'})
if status != 200:
    print("Login failed!")
    exit()

token = res['access_token']
H = {'Authorization': f'Bearer {token}'}

# Simulate the exact payload sent by the frontend MedicineForm on submit
# Front-end selects:
# Packaging Type = Box
# Strips per Box = 12
# Units per Strip = 10
# => Calculated total_base_units = 120
# Purchase Price (Full Pack) = $180.00
# => Calculated unit_cost = 180 / 120 = $1.50
# Unit Sale Price = $2.50
# => Calculated full_pack_sale_price = 2.50 * 120 = $300.00

payload = {
    "name": "Panadol Dynamic Box Test",
    "generic_name": "Paracetamol",
    "brand_name": "Panadol",
    "manufacturer": "GSK",
    "category": "Analgesic",
    "barcode": f"50002000100_{int(time.time())}",
    "reorder_level": 15,
    "max_stock_level": 150,
    "is_active": True,
    
    # Packaging specs
    "packaging_unit": "Box",
    "units_per_pack": 120,          # Calculated total_base_units
    "strips_per_box": 12,
    "units_per_strip": 10,
    "volume_weight": None,
    "shelf": "Shelf B-2",

    # Pricing specs
    "purchase_price": 1.50,         # Unit Cost (180 / 120)
    "sale_price": 2.50,             # Unit Sale Price
    "mrp": 3.00,
    "tax_rate": 5.0,
    "is_controlled": False
}

# Create medicine
status, created_med = request('/api/v1/inventory/medicines', 'POST', payload, headers=H)
print(f"Create Medicine Response Code: {status}")
if status == 200:
    print("\n--- Medicine successfully created on backend! ---")
    print(f"Name: {created_med['name']}")
    print(f"Packaging Type (packaging_unit): {created_med['packaging_unit']}")
    print(f"Strips per Box: {created_med['strips_per_box']}")
    print(f"Units per Strip: {created_med['units_per_strip']}")
    print(f"Multiplier (units_per_pack): {created_med['units_per_pack']}")
    print(f"Unit Cost (purchase_price): ${created_med['purchase_price']}")
    print(f"Unit Sale Price (sale_price): ${created_med['sale_price']}")
    
    # Assert values
    assert created_med['units_per_pack'] == 120, "units_per_pack should be 120"
    assert created_med['purchase_price'] == 1.50, "purchase_price should be 1.50"
    assert created_med['sale_price'] == 2.50, "sale_price should be 2.50"
    assert created_med['strips_per_box'] == 12, "strips_per_box should be 12"
    assert created_med['units_per_strip'] == 10, "units_per_strip should be 10"
    assert created_med['volume_weight'] is None, "volume_weight should be None"
    print("\n[SUCCESS] All dynamic packaging and pricing calculations assert successfully on backend serialization!")
else:
    print(f"Failed to create medicine: {created_med}")
