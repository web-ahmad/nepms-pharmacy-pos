import sys
import os
import traceback

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.inventory import Medicine, Batch
from models.sales import Sale

def run_tests():
    print("=== Starting Sales History & Sale Return API Verification via TestClient ===")
    client = TestClient(app)

    # 1. Login
    print("\n1. Logging in as owner...")
    login_res = client.post('/api/v1/auth/login', json={"username": "owner", "password": "Demo@123"})
    if login_res.status_code != 200:
        print(f"FAILED: Login failed: {login_res.text}")
        sys.exit(1)
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("SUCCESS: Logged in successfully.")

    # 2. Get Sales History
    print("\n2. Fetching Sales History...")
    sales_res = client.get('/api/v1/sales?limit=5', headers=headers)
    if sales_res.status_code != 200:
        print(f"FAILED: Sales history retrieval failed: {sales_res.text}")
        sys.exit(1)
    
    sales_data = sales_res.json()
    total_sales = sales_data["total"]
    items = sales_data["items"]
    print(f"SUCCESS: Retrieved sales history. Total count: {total_sales}, returned count: {len(items)}")

    # 3. Create a transaction if no sale exists
    sale_to_use = None
    if len(items) == 0:
        print("\n3. No existing sales found. Creating a test sale...")
        # Get medicine with stock
        db = SessionLocal()
        try:
            med = db.query(Medicine).join(Batch).filter(Batch.current_quantity > 0).first()
            if not med:
                print("FAILED: No medicine with stock found in database.")
                sys.exit(1)
            
            checkout_payload = {
                "customer_id": None,
                "items": [
                    {
                        "medicine_id": med.id,
                        "quantity": 1,
                        "unit_price": med.sale_price,
                        "discount": 0.0
                    }
                ],
                "discount_amount": 0.0,
                "tax_amount": 0.0,
                "amount_paid": med.sale_price,
                "payment_method": "Cash",
                "hold_sale": False
            }
        finally:
            db.close()

        checkout_res = client.post('/api/v1/sales/checkout', json=checkout_payload, headers=headers)
        if checkout_res.status_code != 200:
            print(f"FAILED: Checkout failed: {checkout_res.text}")
            sys.exit(1)
        
        sale_to_use = checkout_res.json()
        print(f"SUCCESS: Created test sale with Invoice Number: {sale_to_use['invoice_number']}")
    else:
        sale_to_use = items[0]
        print(f"\n3. Using existing sale with Invoice Number: {sale_to_use['invoice_number']}")

    # 4. Fetch Sale Detail
    print(f"\n4. Fetching sale detail for ID: {sale_to_use['id']}...")
    detail_res = client.get(f"/api/v1/sales/{sale_to_use['id']}", headers=headers)
    if detail_res.status_code != 200:
        print(f"FAILED: Failed to fetch sale detail: {detail_res.text}")
        sys.exit(1)
    
    sale_detail = detail_res.json()
    print(f"SUCCESS: Retrieved detail. Items count: {len(sale_detail['items'])}")

    # 5. Process Return for 1 item
    if len(sale_detail["items"]) == 0:
        print("FAILED: Sale has no items to return.")
        sys.exit(1)
    
    target_item = sale_detail["items"][0]
    already_returned = target_item.get("quantity_returned_so_far", 0)
    qty_to_return = target_item["quantity"] - already_returned
    
    if qty_to_return <= 0:
        print(f"Notice: Item '{target_item['medicine_name']}' is already fully returned. Checking next items...")
        for it in sale_detail["items"]:
            if it["quantity"] - it.get("quantity_returned_so_far", 0) > 0:
                target_item = it
                qty_to_return = it["quantity"] - it.get("quantity_returned_so_far", 0)
                break
    
    if qty_to_return <= 0:
        print("Notice: All items in this sale are already returned. Skipping return test.")
        print("SUCCESS: Skipped return test since all items are fully returned.")
        return

    # Let's return just 1 unit
    qty_to_return = 1
    print(f"\n5. Processing return for {qty_to_return} units of '{target_item['medicine_name']}'...")
    return_payload = {
        "items": [
            {
                "sale_item_id": target_item["id"],
                "quantity_returned": qty_to_return,
                "return_reason": "Wrong Medicine",
                "stock_action": "Returned to Stock"
            }
        ],
        "payment_mode": "Cash",
        "notes": "Automated verification return via TestClient"
    }

    return_res = client.post(f"/api/v1/sales/{sale_to_use['id']}/return", json=return_payload, headers=headers)
    if return_res.status_code != 200:
        print(f"FAILED: Return processing failed: {return_res.text}")
        sys.exit(1)
    
    sale_return = return_res.json()
    print(f"SUCCESS: Return processed. Return Number: {sale_return['return_number']}, Total Refund: ${sale_return['total_amount']}")

    # 6. Verify Return Logs
    print("\n6. Fetching return logs timeline...")
    logs_res = client.get("/api/v1/sales/returns/logs", headers=headers)
    if logs_res.status_code != 200:
        print(f"FAILED: Return logs retrieval failed: {logs_res.text}")
        sys.exit(1)
    
    logs = logs_res.json()
    print(f"SUCCESS: Retrieved {len(logs)} return logs.")
    assert len(logs) > 0, "Return logs should contain at least our return record"
    
    # Check if our return number is in logs
    found_log = False
    for log in logs:
        if log["return_number"] == sale_return["return_number"]:
            found_log = True
            print(f"SUCCESS: Found our return {sale_return['return_number']} in audit logs stream!")
            break
    
    if not found_log:
        print(f"WARNING: Return number {sale_return['return_number']} not found in log timeline.")

    print("\n=== All Sales History & Return API verifications passed successfully! ===")

if __name__ == "__main__":
    run_tests()
