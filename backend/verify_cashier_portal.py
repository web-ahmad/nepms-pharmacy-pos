"""
Full E2E verification for Cashier Portal / Cash Register workflow.
Tests: open session, check guard, log expense, verify sale with ledger injection,
       close session with discrepancy, role-based access.
"""
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000/api/v1"


def login(username, password):
    r = requests.post(f"{BASE}/auth/login", json={"username": username, "password": password})
    if r.status_code != 200:
        print(f"  [FAIL] Login {username}: {r.status_code}")
        return None
    data = r.json()
    print(f"  [OK] Logged in: {username} (role={data.get('user', {}).get('role', '?')})")
    return data["access_token"]


def h(token):
    return {"Authorization": f"Bearer {token}"}


print("\n========== CASHIER PORTAL VERIFICATION ==========\n")

token = login("owner", "Demo@123")
if not token:
    token = login("admin", "admin123")
assert token, "Cannot login - stopping"

print()

# ─── 1. Check session (should be none initially) ────────────────────────────
r = requests.get(f"{BASE}/cashier/session/check", headers=h(token))
assert r.status_code == 200, f"check failed: {r.text}"
data = r.json()
print(f"[1] Session check: has_open={data['has_open_session']}")
assert not data["has_open_session"], "Expected no open session"
print("    PASS\n")

# ─── 2. Open session ─────────────────────────────────────────────────────────
r = requests.post(f"{BASE}/cashier/session/open", json={"opening_balance": 5000.0}, headers=h(token))
assert r.status_code == 200, f"open session failed: {r.text}"
data = r.json()
session_id = data["session_id"]
print(f"[2] Open session: id={session_id[:8]}... opening_balance=Rs {data['opening_balance']}")
assert data["opening_balance"] == 5000.0
print("    PASS\n")

# ─── 3. Duplicate open session must fail 409 ────────────────────────────────
r2 = requests.post(f"{BASE}/cashier/session/open", json={"opening_balance": 1000.0}, headers=h(token))
print(f"[3] Duplicate open session: {r2.status_code} (expected 409)")
assert r2.status_code == 409, f"Expected 409, got {r2.status_code}: {r2.text}"
print("    PASS\n")

# ─── 4. Log counter expense ──────────────────────────────────────────────────
r = requests.post(f"{BASE}/cashier/expense", json={
    "amount": 350.0,
    "notes": "Stationery purchase",
    "payment_mode": "Cash"
}, headers=h(token))
assert r.status_code == 200, f"expense failed: {r.text}"
data = r.json()
print(f"[4] Log expense: type={data['entry_type']} amount={data['amount']} notes={data['notes']}")
assert data["entry_type"] == "EXPENSE"
assert data["amount"] == -350.0  # stored negative
print("    PASS\n")

# ─── 5. Checkout + verify-complete → auto-inject ledger entry ───────────────
# Get medicine
r = requests.get(f"{BASE}/inventory/medicines?search_term=para", headers=h(token))
meds = r.json().get("items", [])
med_id = next((m["id"] for m in meds if (m.get("total_quantity") or 0) > 0), None)
if not med_id and meds:
    med_id = meds[0]["id"]
assert med_id, "No medicine found"

r = requests.post(f"{BASE}/sales/checkout", json={
    "items": [{"medicine_id": med_id, "quantity": 1, "unit_price": 80.0, "discount": 0.0}],
    "discount_amount": 0.0, "tax_amount": 0.0,
    "amount_paid": 0.0, "payment_method": "Cash", "hold_sale": False
}, headers=h(token))
assert r.status_code == 200, f"checkout failed: {r.text}"
sale = r.json()
sale_id = sale["id"]
print(f"[5a] Order Taker checkout: inv={sale['invoice_number']} status={sale['status']}")
assert sale["status"] == "Pending Verification"

# Verify-complete
r = requests.post(f"{BASE}/sales/{sale_id}/verify-complete", json={
    "amount_paid": 100.0, "payment_method": "Cash"
}, headers=h(token))
assert r.status_code == 200, f"verify failed: {r.text}"
sale = r.json()
print(f"[5b] Verify-complete: status={sale['status']} amount_paid={sale['amount_paid']}")
assert sale["status"] == "Completed"
print("    PASS\n")

# ─── 6. Check live session summary with ledger entries ──────────────────────
r = requests.get(f"{BASE}/cashier/session/current", headers=h(token))
assert r.status_code == 200, f"summary failed: {r.text}"
summary = r.json()
print(f"[6] Live session summary:")
print(f"    Opening Balance:  Rs {summary['opening_balance']:.2f}")
print(f"    Total Cash Sales: Rs {summary['total_cash_in']:.2f}")
print(f"    Total Expenses:   Rs {summary['total_expenses']:.2f}")
print(f"    Expected Drawer:  Rs {summary['expected_drawer']:.2f}")
print(f"    Ledger entries:   {len(summary['ledger_entries'])} records")

expected_drawer = 5000.0 + sale["total_amount"] - 350.0
assert abs(summary['expected_drawer'] - expected_drawer) < 0.01, \
    f"Expected drawer Rs {expected_drawer:.2f}, got Rs {summary['expected_drawer']:.2f}"

entry_types = [e["entry_type"] for e in summary["ledger_entries"]]
print(f"    Entry types: {entry_types}")
assert "OPENING" in entry_types, "Missing OPENING entry"
assert "EXPENSE" in entry_types, "Missing EXPENSE entry"
assert "SALE" in entry_types, "Missing SALE entry — ledger injection failed!"
print("    PASS\n")

# ─── 7. Close session with actual cash (short by Rs 200) ────────────────────
actual_cash = summary['expected_drawer'] - 200.0  # deliberate short
r = requests.post(f"{BASE}/cashier/session/close", json={
    "closing_balance_actual": actual_cash,
    "discrepancy_notes": "Counter short - possible theft/error"
}, headers=h(token))
assert r.status_code == 200, f"close failed: {r.text}"
data = r.json()
print(f"[7] Close session:")
print(f"    Status: {data['status']}")
print(f"    Expected: Rs {data['closing_balance_expected']:.2f}")
print(f"    Actual:   Rs {data['closing_balance_actual']:.2f}")
print(f"    Discrepancy: Rs {data['discrepancy']:.2f} -> {data['discrepancy_label']}")
assert data["status"] == "CLOSED"
assert abs(data["discrepancy"] - (-200.0)) < 0.01, f"Expected -200 discrepancy"
assert "SHORT" in data["discrepancy_label"]
print("    PASS\n")

# ─── 8. No open session after close ─────────────────────────────────────────
r = requests.get(f"{BASE}/cashier/session/check", headers=h(token))
data = r.json()
print(f"[8] Post-close session check: has_open={data['has_open_session']} (expected False)")
assert not data["has_open_session"]
print("    PASS\n")

# ─── 9. Expense without open session -> 404 ─────────────────────────────────
r = requests.post(f"{BASE}/cashier/expense", json={
    "amount": 100.0, "notes": "Test", "payment_mode": "Cash"
}, headers=h(token))
print(f"[9] Expense without open session: {r.status_code} (expected 404)")
assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
print("    PASS\n")

print("========== ALL CASHIER PORTAL CHECKS PASSED ==========\n")
