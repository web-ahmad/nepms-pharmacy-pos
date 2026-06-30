import requests
from datetime import date

BASE = 'http://127.0.0.1:8000'
r = requests.post(f'{BASE}/api/v1/auth/login', json={'username':'owner','password':'Demo@123'})
token = r.json()['access_token']
H = {'Authorization': f'Bearer {token}'}

# Get a Draft PO that has items
pos = requests.get(f'{BASE}/api/v1/purchase/orders', headers=H).json()
draft_pos = [p for p in pos if p['status'] == 'Draft']
test_po = None
for p in draft_pos:
    detail = requests.get(f'{BASE}/api/v1/purchase/orders/{p["id"]}', headers=H).json()
    if detail.get('items'):
        test_po = detail
        break

if not test_po:
    print("No Draft PO with items found!")
    exit()

print(f"Using PO: {test_po['order_number']} with {len(test_po['items'])} items")
print(f"Supplier: {test_po['supplier_name']}")

# Step 1: Approve PO
approve = requests.post(f'{BASE}/api/v1/purchase/orders/{test_po["id"]}/approve', headers=H)
print(f"\n[1] Approve: {approve.status_code} -> {approve.json().get('status')}")

# Step 2: Create GRN
grn_items = []
for item in test_po['items']:
    grn_items.append({
        "po_item_id": item['id'],
        "medicine_id": item['medicine_id'],
        "batch_number": f"BATCH-TEST-{item['id'][:4].upper()}",
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
grn_resp = requests.post(f'{BASE}/api/v1/purchase/grn', json=grn_payload, headers=H)
print(f"\n[2] GRN Create: {grn_resp.status_code}")
if grn_resp.status_code == 200:
    grn = grn_resp.json()
    print(f"    GRN: {grn['grn_number']}, status={grn['status']}")
else:
    print(f"    Error: {grn_resp.text[:200]}")

# Step 3: Check PO status updated
po_updated = requests.get(f'{BASE}/api/v1/purchase/orders/{test_po["id"]}', headers=H).json()
print(f"\n[3] PO Status: {po_updated['status']}")

# Step 4: Check invoices for this PO
invoices = requests.get(f'{BASE}/api/v1/purchase/invoices?po_id={test_po["id"]}', headers=H).json()
print(f"\n[4] Invoices for PO: {len(invoices)} invoice(s)")
for inv in invoices:
    print(f"    {inv['invoice_number']} | Total=${inv['total_amount']} | Status={inv['status']}")
