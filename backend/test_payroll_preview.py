"""
Verification test: zero-attendance = zero-pay, speed, crash resistance
"""
import sys, time
sys.path.insert(0, '.')
from database import SessionLocal
from repositories.hr import HRRepository
from models.users import User

db = SessionLocal()
repo = HRRepository(db)

user = db.query(User).first()
if not user:
    print("No users found in DB")
    db.close()
    exit(1)

tenant_id = user.tenant_id
print(f"Tenant: {tenant_id}\n")

# ── Test 1: Speed benchmark ──────────────────────────────────────────────────
print("--- TEST 1: Speed (July 2026) ---")
t0 = time.perf_counter()
result = repo.calculate_payroll_lines(tenant_id, 7, 2026)
elapsed = (time.perf_counter() - t0) * 1000
print(f"Returned {len(result)} lines in {elapsed:.1f}ms")
assert elapsed < 1000, f"SLOW: took {elapsed:.1f}ms (limit 1000ms)"
print(f"PASS: Completed in {elapsed:.1f}ms (< 1000ms)\n")

# ── Test 2: Zero-attendance check ────────────────────────────────────────────
print("--- TEST 2: Payroll line details ---")
for r in result:
    print(f"  {r['employee_name']:30s}  base={r['base_salary']:10.2f}  "
          f"deductions={r['deductions']:10.2f}  net={r['net_pay']:10.2f}  "
          f"units={r['worked_units']}")
    # Validate: net must never be negative
    assert r['net_pay'] >= 0, f"FAIL: Negative net pay for {r['employee_name']}"
    # Validate: if 0 attendance days in units, net should be 0 for monthly
    if "0 /" in (r['worked_units'] or ""):
        assert r['net_pay'] == 0.0, f"FAIL: Zero-attendance employee {r['employee_name']} has net={r['net_pay']} (expected 0)"
        print(f"    => PASS: Zero attendance = Zero pay confirmed")

print("\nAll tests passed!")
db.close()
