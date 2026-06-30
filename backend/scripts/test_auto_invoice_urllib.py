import urllib.request
import urllib.parse
import json
from datetime import date

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
token = res['access_token']
H = {'Authorization': f'Bearer {token}'}

# Get a Draft PO that has items
status, pos = request('/api/v1/purchase/orders', 'GET', headers=H)
draft_pos = [p for p in pos if p['status'] == 'Draft']
test_po = None
for p in draft_pos:
    status, detail = request(f'/api/v1/purchase/orders/{p["id"]}', 'GET', headers=H)
    if detail.get('items'):
        test_po = detail
        break

if not test_po:
    print("No Draft PO with items found!")
    # Let's create one
    print("Creating a new Draft PO...")
    # Find a supplier
    status, suppliers = request('/api/v1/purchase/suppliers', 'GET', headers=H)
    if not suppliers:
        print("No suppliers found!")
        exit()
    supplier_id = suppliers[0]['id']
    # Find a medicine
    status, medicines = request('/api/v1/inventory/medicines', 'GET', headers=H)
    if not medicines:
        print("No medicines found!")
        exit()
    med_id = medicines[0]['id']
    
    po_payload = {
        "supplier_id": supplier_id,
        "expected_delivery_date": str(date.today()),
        "total_amount": 100.0,
        "items": [
            {
                "medicine_id": med_id,
                "quantity_ordered": 10,
                "unit_price": 10.0
            }
        ]
    }
    status, test_po = request('/api/v1/purchase/orders', 'POST', po_payload, headers=H)
    # Refetch PO details
    status, test_po = request(f'/api/v1/purchase/orders/{test_po["id"]}', 'GET', headers=H)

print(f"Using PO: {test_po['order_number']} with {len(test_po['items'])} items")
print(f"Supplier: {test_po.get('supplier_name') or test_po.get('supplier_id')}")

# Step 1: Approve PO
status, approve_res = request(f'/api/v1/purchase/orders/{test_po["id"]}/approve', 'POST', headers=H)
print(f"\n[1] Approve: {status} -> {approve_res.get('status')}")

# Step 2: Create GRN
grn_items = []
for item in test_po['items']:
    grn_items.append({
        "po_item_id": item['id'],
        "medicine_id": item['medicine_id'],
        "batch_number": f"B-{uuid_hex()[:4].upper()}" if 'uuid_hex' in globals() else f"B-TEST-{item['id'][:4].upper()}",
        "manufacturing_date": str(date.today()),
        "expiry_date": "2027-12-31",
        "purchase_price": item['unit_price'],
        "selling_price": round(item['unit_price'] * 1.3, 2),
        "quantity_received": item['quantity_ordered']
    })

grn_payload = {
    "po_id": test_po['id'],
    "supplier_id": test_po['supplier_id'],
    "received_date": str(date.today()),
    "total_amount": test_po['total_amount'],
    "items": grn_items
}
status, grn = request('/api/v1/purchase/grn', 'POST', grn_payload, headers=H)
print(f"\n[2] GRN Create: {status}")
if status == 200:
    print(f"    GRN: {grn['grn_number']}, status={grn['status']}")
else:
    print(f"    Error: {grn}")

# Step 3: Check PO status updated
status, po_updated = request(f'/api/v1/purchase/orders/{test_po["id"]}', 'GET', headers=H)
print(f"\n[3] PO Status: {po_updated['status']}")

# Step 4: Check invoices for this PO
status, invoices = request(f'/api/v1/purchase/invoices?po_id={test_po["id"]}', 'GET', headers=H)
print(f"\n[4] Invoices for PO: {len(invoices)} invoice(s)")
for inv in invoices:
    print(f"    {inv['invoice_number']} | Total=${inv['total_amount']} | Status={inv['status']}")
    print(f"    Items in List response:")
    for item in inv.get('items', []):
        print(f"      - {item['medicine_name']} | Qty: {item['quantity']} | Price: ${item['unit_price']} | Total: ${item['total_price']}")
    
    # Test single invoice detail endpoint
    det_status, inv_detail = request(f'/api/v1/purchase/invoices/{inv["id"]}', 'GET', headers=H)
    print(f"    [5] Detail Endpoint GET /invoices/{inv['id']}: status={det_status}")
    print(f"    Items in Detail response:")
    for item in inv_detail.get('items', []):
        print(f"      - {item['medicine_name']} | Qty: {item['quantity']} | Price: ${item['unit_price']} | Total: ${item['total_price']}")
