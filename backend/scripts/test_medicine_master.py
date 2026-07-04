import urllib.request
import urllib.parse
import json

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

print("\n1. Testing Master Data Creation (Generics)")
status, generic_res = request('/api/v1/master-data/generics', 'POST', {'name': 'Paracetamol', 'description': 'Pain reliever'}, headers=H)
print(f"Status: {status}, Response: {generic_res}")
generic_id = generic_res.get('id') if status in [200, 201] else "test-gen-id"

print("\n2. Testing Medicine Master Creation")
payload = {
    "name": "Panadol Advance 500mg",
    "generic_id": generic_id,
    "sku": "PAN-500",
    "is_controlled": False,
    "packaging": [
        {
            "level_name": "Box",
            "conversion_qty": 100,
            "barcode": "123456789",
            "is_sale_unit": True,
            "is_purchase_unit": True
        }
    ],
    "pricing": {
        "cost_per_base_unit": 0.50,
        "margin_percent": 20.0
    }
}
status, med_res = request('/api/v1/medicines', 'POST', payload, headers=H)
print(f"Status: {status}, Response: {med_res}")
if status in [200, 201]:
    print("\n[SUCCESS] New Medicine Master created successfully!")
