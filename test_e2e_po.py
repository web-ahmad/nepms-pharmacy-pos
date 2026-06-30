import requests
import uuid
from datetime import date, timedelta

def test_e2e_po():
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login
    print("1. Logging in...")
    res = requests.post(f"{base_url}/auth/login", json={"username": "admin", "password": "admin123"})
    if res.status_code != 200:
        print("Login failed:", res.text)
        return
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Fetch POs
    print("2. Fetching POs...")
    res = requests.get(f"{base_url}/purchase/orders", headers=headers)
    pos = res.json()
    if not pos:
        print("No POs found.")
        return
    po = pos[0]
    po_id = po["id"]
    print(f"   Selected PO: {po_id} (Status: {po['status']})")
    
    # 3. Approve PO if necessary
    if po["status"] in ["Draft", "Submitted"]:
        print("3. Approving PO...")
        res = requests.post(f"{base_url}/purchase/orders/{po_id}/approve", headers=headers)
        if res.status_code != 200:
            print("   Failed to approve:", res.text)
            return
        po = res.json()
        print("   PO Approved successfully.")
    
    # Fetch detailed PO to get items
    print("4. Fetching detailed PO...")
    res = requests.get(f"{base_url}/purchase/orders/{po_id}", headers=headers)
    po = res.json()
    items = po.get("items", [])
    if not items:
        print("   PO has no items.")
        return
        
    print(f"   PO has {len(items)} items.")
    
    # 5. Process GRN
    print("5. Processing GRN...")
    grn_items = []
    for item in items:
        grn_items.append({
            "po_item_id": item["id"],
            "medicine_id": item["medicine_id"],
            "batch_number": f"BATCH-{uuid.uuid4().hex[:6].upper()}",
            "manufacturing_date": str(date.today() - timedelta(days=30)),
            "expiry_date": str(date.today() + timedelta(days=365)),
            "purchase_price": item["unit_price"],
            "selling_price": item["unit_price"] * 1.5,
            "quantity_received": item["quantity_ordered"]
        })
        
    grn_payload = {
        "po_id": po_id,
        "supplier_id": po["supplier_id"],
        "received_date": str(date.today()),
        "total_amount": po["total_amount"],
        "items": grn_items
    }
    
    res = requests.post(f"{base_url}/purchase/grn", json=grn_payload, headers=headers)
    if res.status_code != 200:
        print("   Failed to create GRN:", res.text)
        return
    grn = res.json()
    grn_id = grn["id"]
    print(f"   GRN created successfully: {grn_id}")
    
    # 6. Generate Invoice
    print("6. Generating Invoice...")
    invoice_payload = {
        "grn_id": grn_id,
        "supplier_id": po["supplier_id"],
        "invoice_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=30)),
        "total_amount": po["total_amount"],
        "tax_amount": 0,
        "amount_paid": 0
    }
    res = requests.post(f"{base_url}/purchase/invoices", json=invoice_payload, headers=headers)
    if res.status_code != 200:
        print("   Failed to create Invoice:", res.text)
        return
    print("   Invoice generated successfully:", res.json()["id"])
    
    # 7. Check Medicine Stock
    print("7. Checking Medicine Stock...")
    for item in items:
        medicine_id = item["medicine_id"]
        res = requests.get(f"{base_url}/inventory/medicines/{medicine_id}", headers=headers)
        med = res.json()
        print(f"   Medicine {med['name']} stock: {med.get('total_stock', 'NOT RETURNED BY API')}")

if __name__ == "__main__":
    test_e2e_po()
