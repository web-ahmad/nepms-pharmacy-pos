import requests
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    print("=== Starting Purchase API Audit & Verification ===")

    # 1. Login
    print("\n1. Logging in as owner...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"username": "owner", "password": "Demo@123"})
    if login_res.status_code != 200:
        print(f"FAILED: Login failed with code {login_res.status_code}: {login_res.text}")
        sys.exit(1)
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("SUCCESS: Logged in successfully.")

    # 2. Get first medicine to use for purchase order
    print("\n2. Fetching first available medicine from inventory...")
    med_res = requests.get(f"{BASE_URL}/inventory/medicines?limit=1", headers=headers)
    if med_res.status_code != 200 or not med_res.json().get("items"):
        print(f"FAILED: Could not fetch medicines: {med_res.text}")
        sys.exit(1)
    
    medicine = med_res.json()["items"][0]
    medicine_id = medicine["id"]
    print(f"SUCCESS: Found medicine '{medicine['name']}' (ID: {medicine_id})")

    # 3. Create a Supplier
    print("\n3. Creating a new supplier...")
    supplier_payload = {
        "name": "Audit Test Supplier Ltd",
        "contact_person": "John Doe",
        "phone": "+15550199",
        "email": "supplier@test.com",
        "address": "123 Supply Road, Warehouse City",
        "tax_number": "TX-998811",
        "credit_limit": 50000.0,
        "opening_balance": 0.0,
        "is_active": True
    }
    sup_create_res = requests.post(f"{BASE_URL}/purchase/suppliers", json=supplier_payload, headers=headers)
    if sup_create_res.status_code != 200:
        print(f"FAILED: Supplier creation failed: {sup_create_res.text}")
        sys.exit(1)
    
    supplier = sup_create_res.json()
    supplier_id = supplier["id"]
    print(f"SUCCESS: Supplier '{supplier['name']}' created with ID: {supplier_id}")

    # 4. Get Suppliers List
    print("\n4. Fetching suppliers list...")
    sup_list_res = requests.get(f"{BASE_URL}/purchase/suppliers", headers=headers)
    if sup_list_res.status_code != 200:
        print(f"FAILED: Suppliers list retrieval failed: {sup_list_res.text}")
        sys.exit(1)
    print(f"SUCCESS: Retrieved {len(sup_list_res.json())} suppliers.")

    # 5. Get Supplier details by ID
    print("\n5. Fetching supplier details by ID...")
    sup_detail_res = requests.get(f"{BASE_URL}/purchase/suppliers/{supplier_id}", headers=headers)
    if sup_detail_res.status_code != 200:
        print(f"FAILED: Supplier details retrieval failed: {sup_detail_res.text}")
        sys.exit(1)
    print(f"SUCCESS: Retrieved supplier details for '{sup_detail_res.json()['name']}'")

    # 6. Update Supplier
    print("\n6. Updating supplier details...")
    supplier_update_payload = {
        "name": "Audit Test Supplier Ltd (Updated)",
        "contact_person": "Jane Doe",
        "is_active": True
    }
    sup_update_res = requests.put(f"{BASE_URL}/purchase/suppliers/{supplier_id}", json=supplier_update_payload, headers=headers)
    if sup_update_res.status_code != 200:
        print(f"FAILED: Supplier update failed: {sup_update_res.text}")
        sys.exit(1)
    print(f"SUCCESS: Supplier contact person updated to '{sup_update_res.json()['contact_person']}'")

    # 7. Create Purchase Order (Draft)
    print("\n7. Creating a new Purchase Order...")
    po_payload = {
        "supplier_id": supplier_id,
        "expected_delivery_date": "2026-07-01",
        "total_amount": 200.0,
        "items": [
            {
                "medicine_id": medicine_id,
                "quantity_ordered": 100,
                "unit_price": 2.0
            }
        ]
    }
    po_create_res = requests.post(f"{BASE_URL}/purchase/orders", json=po_payload, headers=headers)
    if po_create_res.status_code != 200:
        print(f"FAILED: PO creation failed: {po_create_res.text}")
        sys.exit(1)
    
    po = po_create_res.json()
    po_id = po["id"]
    po_item_id = po["items"][0]["id"]
    print(f"SUCCESS: Purchase Order {po['order_number']} created in state: {po['status']}")

    # 8. Approve Purchase Order
    print("\n8. Approving Purchase Order...")
    po_approve_res = requests.post(f"{BASE_URL}/purchase/orders/{po_id}/approve", headers=headers)
    if po_approve_res.status_code != 200:
        print(f"FAILED: PO approval failed: {po_approve_res.text}")
        sys.exit(1)
    print(f"SUCCESS: PO status changed to: {po_approve_res.json()['status']}")

    # 9. Receive Goods (GRN)
    print("\n9. Receiving Goods (GRN) against approved PO...")
    # Get current stock level of the medicine before GRN
    initial_stock = requests.get(f"{BASE_URL}/inventory/medicines/{medicine_id}", headers=headers).json()["total_quantity"]
    print(f"Initial medicine stock level: {initial_stock}")

    grn_payload = {
        "po_id": po_id,
        "supplier_id": supplier_id,
        "received_date": "2026-06-21",
        "total_amount": 200.0,
        "items": [
            {
                "po_item_id": po_item_id,
                "medicine_id": medicine_id,
                "batch_number": "B-VERIFY-100",
                "manufacturing_date": "2026-01-01",
                "expiry_date": "2028-01-01",
                "purchase_price": 2.0,
                "selling_price": 3.5,
                "quantity_received": 100
            }
        ]
    }
    grn_res = requests.post(f"{BASE_URL}/purchase/grn", json=grn_payload, headers=headers)
    if grn_res.status_code != 200:
        print(f"FAILED: GRN submission failed: {grn_res.text}")
        sys.exit(1)
    
    grn = grn_res.json()
    grn_id = grn["id"]
    print(f"SUCCESS: Goods Received Note {grn['grn_number']} processed.")

    # 10. Verify PO transitioned to 'Completed' (since we received all items ordered)
    print("\n10. Checking updated PO status...")
    po_check = requests.get(f"{BASE_URL}/purchase/orders/{po_id}", headers=headers).json()
    print(f"PO {po_check['order_number']} status: {po_check['status']}")
    if po_check["status"] != "Completed":
        print(f"FAILED: PO status is {po_check['status']}, expected 'Completed'")
        sys.exit(1)
    print("SUCCESS: PO status correctly updated to 'Completed'.")

    # 11. Verify Inventory Stock Increased correctly (GRN & Inventory Sync)
    print("\n11. Verifying inventory stock sync...")
    final_stock = requests.get(f"{BASE_URL}/inventory/medicines/{medicine_id}", headers=headers).json()["total_quantity"]
    print(f"Final medicine stock level: {final_stock}")
    if final_stock != initial_stock + 100:
        print(f"FAILED: Stock did not increase by 100. Expected {initial_stock + 100}, got {final_stock}")
        sys.exit(1)
    print("SUCCESS: Inventory stock correctly increased by 100.")

    # 12. Create Purchase Invoice
    print("\n12. Creating Purchase Invoice for the GRN...")
    invoice_payload = {
        "grn_id": grn_id,
        "supplier_id": supplier_id,
        "invoice_date": "2026-06-21",
        "due_date": "2026-07-21",
        "total_amount": 200.0,
        "tax_amount": 0.0,
        "amount_paid": 0.0
    }
    invoice_res = requests.post(f"{BASE_URL}/purchase/invoices", json=invoice_payload, headers=headers)
    if invoice_res.status_code != 200:
        print(f"FAILED: Purchase invoice creation failed: {invoice_res.text}")
        sys.exit(1)
    invoice = invoice_res.json()
    invoice_id = invoice["id"]
    print(f"SUCCESS: Invoice {invoice['invoice_number']} created in status: {invoice['status']}")

    # 13. Get Invoices List with filtering by PO ID
    print("\n13. Fetching invoices list filtered by PO ID...")
    inv_list_res = requests.get(f"{BASE_URL}/purchase/invoices?po_id={po_id}", headers=headers)
    if inv_list_res.status_code != 200 or len(inv_list_res.json()) == 0:
        print(f"FAILED: Invoices filtering by po_id failed: {inv_list_res.text}")
        sys.exit(1)
    print(f"SUCCESS: Retrieved {len(inv_list_res.json())} invoice(s) associated with PO ID: {po_id}")

    # 14. Create Supplier Payment
    print("\n14. Paying supplier invoice...")
    payment_payload = {
        "supplier_id": supplier_id,
        "invoice_id": invoice_id,
        "amount": 200.0,
        "payment_method": "Cash",
        "reference_number": "PAY-AUDIT-100",
        "notes": "Paid full invoice for audit GRN"
    }
    payment_res = requests.post(f"{BASE_URL}/purchase/payments", json=payment_payload, headers=headers)
    if payment_res.status_code != 200:
        print(f"FAILED: Supplier payment logging failed: {payment_res.text}")
        sys.exit(1)
    print(f"SUCCESS: Payment of ${payment_res.json()['amount']} logged.")

    # 15. Verify Supplier Ledger
    print("\n15. Fetching supplier ledger...")
    ledger_res = requests.get(f"{BASE_URL}/purchase/suppliers/{supplier_id}/ledger", headers=headers)
    if ledger_res.status_code != 200:
        print(f"FAILED: Supplier ledger retrieval failed: {ledger_res.text}")
        sys.exit(1)
    
    ledger = ledger_res.json()
    print("Supplier Ledger Entries:")
    for entry in ledger:
        print(f"  [{entry['transaction_date']}] {entry['transaction_type']} | Ref: {entry['reference_id']} | Debit: {entry['debit']} | Credit: {entry['credit']} | Balance After: {entry['balance_after']}")
    print("SUCCESS: Ledger loaded correctly.")

    # 16. Create another PO and Cancel it
    print("\n16. Testing Purchase Order Cancellation...")
    po_cancel_payload = {
        "supplier_id": supplier_id,
        "expected_delivery_date": "2026-08-01",
        "total_amount": 100.0,
        "items": [
            {
                "medicine_id": medicine_id,
                "quantity_ordered": 50,
                "unit_price": 2.0
            }
        ]
    }
    po2_res = requests.post(f"{BASE_URL}/purchase/orders", json=po_cancel_payload, headers=headers)
    po2_id = po2_res.json()["id"]
    po2_num = po2_res.json()["order_number"]
    print(f"Created second PO {po2_num} in status: {po2_res.json()['status']}")
    
    cancel_res = requests.post(f"{BASE_URL}/purchase/orders/{po2_id}/cancel", headers=headers)
    if cancel_res.status_code != 200:
        print(f"FAILED: PO cancellation failed: {cancel_res.text}")
        sys.exit(1)
    print(f"SUCCESS: PO {po2_num} cancelled. Status is now: {cancel_res.json()['status']}")

    print("\n=== ALL PURCHASE MODULE APIS ARE WORKING FLAWLESSLY! ===")

if __name__ == "__main__":
    run_tests()
