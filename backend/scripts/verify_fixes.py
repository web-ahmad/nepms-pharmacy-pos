import requests

r = requests.post('http://127.0.0.1:8000/api/v1/auth/login', json={'username':'owner','password':'Demo@123'})
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 1. Check PO list is sorted by created_at DESC (newest first)
pos = requests.get('http://127.0.0.1:8000/api/v1/purchase/orders', headers=headers).json()
print(f"=== BUG 2: PO List Sorting ===")
print(f"First PO: {pos[0]['order_number']} (status={pos[0]['status']})")
print(f"Second PO: {pos[1]['order_number']}")
print(f"Last PO: {pos[-1]['order_number']}")

# 2. Check medicine_name on PO detail items
draft_pos = [p for p in pos if p['status'] == 'Draft']
test_po_id = draft_pos[0]['id']
po_detail = requests.get(f'http://127.0.0.1:8000/api/v1/purchase/orders/{test_po_id}', headers=headers).json()
print(f"\n=== BUG 3: Medicine Names ===")
print(f"PO: {po_detail['order_number']} has {len(po_detail.get('items', []))} items")
for item in po_detail.get('items', []):
    print(f"  medicine_id={item['medicine_id'][:8]}... => medicine_name='{item.get('medicine_name', 'MISSING')}'")

# 3. Try to approve a Draft PO (should succeed with 'Owner' role)
print(f"\n=== BUG 1: Approve PO ===")
approve_resp = requests.post(f'http://127.0.0.1:8000/api/v1/purchase/orders/{test_po_id}/approve', headers=headers)
print(f"Approve status code: {approve_resp.status_code}")
if approve_resp.status_code == 200:
    print(f"New PO status: {approve_resp.json()['status']}")
else:
    print(f"Error: {approve_resp.text}")
