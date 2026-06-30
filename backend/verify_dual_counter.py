"""
Verification script for Dual-Counter POS workflow.
Tests: login, dual-counter checkout, pending queue, verify-complete (strict payment), new /pending alias.
"""
import sys
import requests
import json

# Force UTF-8 for Windows console
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000/api/v1"


def login(username, password):
    r = requests.post(f"{BASE}/auth/login", json={"username": username, "password": password})
    if r.status_code != 200:
        print(f"  [FAIL] Login {username}: {r.status_code} {r.text}")
        return None
    data = r.json()
    token = data.get("access_token")
    print(f"  [OK] Logged in as {username}")
    return token

def headers(token):
    return {"Authorization": f"Bearer {token}"}

print("\n========== DUAL-COUNTER POS WORKFLOW VERIFICATION ==========\n")

# 1. Check workflow mode
r = requests.get(f"{BASE}/sales/workflow-mode")
mode = r.json().get("mode")
print(f"[1] Workflow mode: {mode}")
assert mode == "DUAL_COUNTER", f"Expected DUAL_COUNTER, got {mode}"
print("    PASS\n")

# 2. Login as order taker (owner or admin)
token = login("owner", "Demo@123")
if not token:
    token = login("admin", "admin123")
if not token:
    print("[FAIL] Cannot login. Stopping.")
    exit(1)

# 3. Get medicines for a valid medicine_id
r = requests.get(f"{BASE}/inventory/medicines?search_term=para", headers=headers(token))
medicines = r.json().get("items", [])
if not medicines:
    r = requests.get(f"{BASE}/inventory/medicines?search_term=a", headers=headers(token))
    medicines = r.json().get("items", [])

print(f"[2] Found {len(medicines)} medicines in search")
if not medicines:
    print("    [WARN] No medicines found - inventory may be empty. Skipping checkout test.")
    test_medicine_id = None
else:
    med = next((m for m in medicines if (m.get("total_quantity") or m.get("available_quantity") or 0) > 0), None)
    test_medicine_id = med["id"] if med else medicines[0]["id"]
    print(f"    Using medicine: {med['name'] if med else medicines[0]['name']} (id={test_medicine_id})")
    print("    PASS\n")

# 4. Checkout in DUAL_COUNTER mode (order taker saves order)
sale_id = None
if test_medicine_id:
    payload = {
        "items": [{"medicine_id": test_medicine_id, "quantity": 2, "unit_price": 50.0, "discount": 0.0}],
        "discount_amount": 0.0,
        "tax_amount": 0.0,
        "amount_paid": 0.0,
        "payment_method": "Cash",
        "hold_sale": False
    }
    r = requests.post(f"{BASE}/sales/checkout", json=payload, headers=headers(token))
    if r.status_code == 200:
        sale = r.json()
        sale_id = sale["id"]
        print(f"[3] Order Taker checkout:")
        print(f"    Invoice: {sale['invoice_number']}")
        print(f"    Status: {sale['status']}")
        print(f"    Amount Paid (should be 0): {sale['amount_paid']}")
        assert sale["status"] == "Pending Verification", f"Expected 'Pending Verification', got '{sale['status']}'"
        assert sale["amount_paid"] == 0.0, f"Expected amount_paid=0, got {sale['amount_paid']}"
        print("    PASS\n")
    else:
        print(f"[3] Checkout FAILED: {r.status_code} - {r.text[:300]}\n")

# 5. Fetch pending queue via /pending-verification
r = requests.get(f"{BASE}/sales/pending-verification", headers=headers(token))
pending = r.json() if r.status_code == 200 else []
print(f"[4] GET /pending-verification -> {len(pending)} pending sales")
if sale_id:
    found = any(s["id"] == sale_id for s in pending)
    print(f"    Our sale in queue: {found}")
    assert found, "Our sale should appear in the queue!"
print("    PASS\n")

# 6. Fetch via /pending alias
r2 = requests.get(f"{BASE}/sales/pending", headers=headers(token))
pending2 = r2.json() if r2.status_code == 200 else []
print(f"[5] GET /pending (alias) -> {r2.status_code} -> {len(pending2)} pending sales")
assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
assert len(pending2) == len(pending), f"Mismatch: /pending={len(pending2)} vs /pending-verification={len(pending)}"
print("    PASS\n")

# 7. Test strict payment validation (walking customer, partial pay -> must fail)
if sale_id:
    total = 100.0  # 2 * 50
    r = requests.post(
        f"{BASE}/sales/{sale_id}/verify-complete",
        json={"amount_paid": 50.0, "payment_method": "Cash"},  # partial → should be rejected
        headers=headers(token)
    )
    print(f"[6] Strict payment validation (walking customer, partial pay):")
    print(f"    Status: {r.status_code} (expected 400)")
    if r.status_code == 400:
        detail = r.json().get("detail", "")
        print(f"    Rejection reason: {detail}")
        print("    PASS\n")
    else:
        print(f"    [FAIL] Expected 400 rejection but got {r.status_code}: {r.text[:200]}\n")

# 8. Verify-complete with correct full payment
if sale_id:
    r = requests.post(
        f"{BASE}/sales/{sale_id}/verify-complete",
        json={"amount_paid": 110.0, "payment_method": "Cash"},  # overpay → should succeed
        headers=headers(token)
    )
    print(f"[7] Verify-complete with full payment:")
    print(f"    Status: {r.status_code} (expected 200)")
    if r.status_code == 200:
        sale = r.json()
        print(f"    Final status: {sale['status']}")
        print(f"    Amount paid: {sale['amount_paid']}")
        print(f"    Change due: {sale['change_due']}")
        assert sale["status"] == "Completed", f"Expected 'Completed', got '{sale['status']}'"
        assert sale["amount_paid"] == 110.0
        assert sale["change_due"] == 10.0
        # Stock should now be allocated (items should have batch_id)
        items_with_batch = [i for i in sale["items"] if i.get("batch_id")]
        print(f"    Items with FEFO batch allocated: {len(items_with_batch)}/{len(sale['items'])}")
        print("    PASS\n")
    else:
        print(f"    [FAIL] {r.status_code}: {r.text[:300]}\n")

# 9. Verify it's no longer in pending queue
r = requests.get(f"{BASE}/sales/pending-verification", headers=headers(token))
pending_after = r.json() if r.status_code == 200 else []
still_pending = any(s["id"] == sale_id for s in pending_after) if sale_id else False
print(f"[8] Post-completion queue check:")
print(f"    Sale still in pending queue: {still_pending} (expected False)")
if not still_pending:
    print("    PASS\n")
else:
    print("    [FAIL] Sale should have been removed from pending queue!\n")

print("========== ALL CHECKS COMPLETE ==========\n")
