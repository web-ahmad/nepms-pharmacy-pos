import requests
import sys

def run_test():
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login
    print("Logging in...")
    login_res = requests.post(f"{base_url}/auth/login", json={"username": "owner", "password": "Demo@123"})
    if login_res.status_code != 200:
        login_res = requests.post(f"{base_url}/auth/login", json={"username": "admin", "password": "admin123"})
        
    if login_res.status_code != 200:
        print("FAIL: Auth failed", login_res.text)
        sys.exit(1)
        
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("SUCCESS: Logged in.")

    # 2. Get active workflow mode
    mode_res = requests.get(f"{base_url}/sales/workflow-mode", headers=headers)
    print(f"Current Workflow Mode: {mode_res.json()}")

    # 3. Fetch medicines to select one for testing
    med_res = requests.get(f"{base_url}/inventory/medicines?skip=0&limit=5", headers=headers)
    meds = med_res.json().get("items", [])
    if not meds:
        print("FAIL: No medicines found in database.")
        sys.exit(1)
        
    test_med = meds[0]
    # Check if stock is available
    initial_stock = test_med.get("total_quantity") or test_med.get("available_quantity") or 0
    if initial_stock < 10:
        print(f"Warning: Selected medicine {test_med['name']} has low stock ({initial_stock}). Testing with quantity 1.")
        qty = 1
    else:
        qty = 10
        
    print(f"Selected Medicine: {test_med['name']} (ID: {test_med['id']}), Initial Stock: {initial_stock}")

    # 4. Step 1: Order Taker Checkout (Guest Customer)
    # Payment detail is 0.0, hold_sale is False
    print("\n--- Testing Order Taker checkout ---")
    checkout_payload = {
        "customer_id": None,
        "items": [
            {
                "medicine_id": test_med["id"],
                "quantity": qty,
                "unit_price": test_med["sale_price"],
                "discount": 0.0
            }
        ],
        "discount_amount": 0.0,
        "tax_amount": 0.0,
        "amount_paid": 0.0,
        "payment_method": "Cash",
        "hold_sale": False
    }
    
    checkout_res = requests.post(f"{base_url}/sales/checkout", json=checkout_payload, headers=headers)
    if checkout_res.status_code != 200:
        print("FAIL: Checkout failed", checkout_res.text)
        sys.exit(1)
        
    sale = checkout_res.json()
    sale_id = sale["id"]
    print(f"SUCCESS: Order saved. Invoice: {sale['invoice_number']}, Status: {sale['status']}, Amount Paid: {sale['amount_paid']}")
    if sale["status"] != "Pending Verification":
        print(f"FAIL: Expected status 'Pending Verification', got '{sale['status']}'")
        sys.exit(1)

    # Verify stock was NOT deducted yet
    check_med_res = requests.get(f"{base_url}/inventory/medicines/{test_med['id']}", headers=headers)
    stock_after_order = check_med_res.json().get("total_quantity") or 0
    print(f"Stock after order (should be same as initial {initial_stock}): {stock_after_order}")
    if stock_after_order != initial_stock:
        print("FAIL: Stock was deducted at the order taker stage!")
        sys.exit(1)
    print("SUCCESS: Stock was deferred correctly.")

    # 5. Step 2: Cashier Verification - Walking Customer (Guest) Strict Partial Payment Check
    print("\n--- Testing Cashier Verification - Guest Partial Payment Validation ---")
    # Total amount is test_med["sale_price"] * qty
    total_amount = sale["total_amount"]
    partial_paid = total_amount - 1.0
    
    verify_payload = {
        "amount_paid": partial_paid,
        "payment_method": "Cash"
    }
    
    verify_res = requests.post(f"{base_url}/{sale_id}/verify-complete", json=verify_payload, headers=headers)
    # This endpoint was added on prefix "/api/v1/sales" in router, but let's double check path
    # In endpoints/sales.py: prefix="/api/v1/sales" is registered in main.py app.include_router(api_router)
    # The endpoint is @router.post("/{sale_id}/verify-complete")
    # So the URL is: base_url + "/sales/" + sale_id + "/verify-complete"
    # Let's fix URL call:
    verify_url = f"{base_url}/sales/{sale_id}/verify-complete"
    verify_res = requests.post(verify_url, json=verify_payload, headers=headers)
    
    print(f"Response code (expected 400): {verify_res.status_code}")
    if verify_res.status_code == 400:
        print("SUCCESS: Partial payment correctly blocked with validation message:", verify_res.json().get("detail"))
    else:
        print(f"FAIL: Expected 400, got {verify_res.status_code}. Response: {verify_res.text}")
        sys.exit(1)

    # 6. Step 3: Cashier Verification - Guest Full Payment Check
    print("\n--- Testing Cashier Verification - Guest Full Payment ---")
    verify_payload_full = {
        "amount_paid": total_amount,
        "payment_method": "Cash"
    }
    verify_res_full = requests.post(verify_url, json=verify_payload_full, headers=headers)
    if verify_res_full.status_code != 200:
        print("FAIL: Verification failed with full payment:", verify_res_full.text)
        sys.exit(1)
        
    completed_sale = verify_res_full.json()
    print(f"SUCCESS: Verification complete. Invoice: {completed_sale['invoice_number']}, Status: {completed_sale['status']}, Change Due: {completed_sale['change_due']}")
    if completed_sale["status"] != "Completed":
        print(f"FAIL: Expected status 'Completed', got '{completed_sale['status']}'")
        sys.exit(1)

    # Verify stock IS deducted now
    check_med_res2 = requests.get(f"{base_url}/inventory/medicines/{test_med['id']}", headers=headers)
    stock_after_verify = check_med_res2.json().get("total_quantity") or 0
    expected_stock = initial_stock - qty
    print(f"Stock after cashier verification (expected {expected_stock}): {stock_after_verify}")
    if stock_after_verify != expected_stock:
        print("FAIL: Stock count was not updated correctly!")
        sys.exit(1)
    print("SUCCESS: Stock was deducted correctly on verification.")

    print("\n==========================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == "__main__":
    run_test()
