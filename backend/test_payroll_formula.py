"""
Unit test: Validate the strict deduction formula in isolation
(No DB needed — pure logic verification)
"""
import sys, calendar
from datetime import date, datetime, timedelta

# ── Mirror the formula from calculate_payroll_lines ──────────────────────────
def compute_monthly_payroll(base_salary, present_days, total_overtime, month, year,
                             days_per_shift=8):
    days_in_month = max(calendar.monthrange(year, month)[1], 1)
    per_day       = base_salary / days_in_month
    unpaid_days   = max(days_in_month - present_days, 0)
    deductions    = round(unpaid_days * per_day, 2)
    hourly_equiv  = base_salary / (days_in_month * days_per_shift)
    allowances    = round(total_overtime * hourly_equiv, 2)
    net           = round(max(base_salary - deductions + allowances, 0.0), 2)
    return deductions, allowances, net

print("=== Strict Deduction Formula Tests ===\n")
MONTH, YEAR = 7, 2026  # July 2026 = 31 days

# Test 1: Full month present → no deductions
d, a, n = compute_monthly_payroll(30000, 31, 0, MONTH, YEAR)
assert d == 0.0 and n == 30000.0, f"FAIL T1: d={d}, n={n}"
print(f"PASS T1 - Full month present:        deductions={d:10.2f}  net={n:10.2f}")

# Test 2: Zero attendance → full deduction → net=0
d, a, n = compute_monthly_payroll(30000, 0, 0, MONTH, YEAR)
assert n == 0.0 and d == 30000.0, f"FAIL T2: d={d}, n={n}"
print(f"PASS T2 - Zero attendance:           deductions={d:10.2f}  net={n:10.2f}")

# Test 3: 15 days present out of 31 → roughly half deducted
d, a, n = compute_monthly_payroll(30000, 15, 0, MONTH, YEAR)
assert n > 0 and d > 0 and n < 30000, f"FAIL T3: d={d}, n={n}"
print(f"PASS T3 - 15/31 days:                deductions={d:10.2f}  net={n:10.2f}")

# Test 4: With overtime allowance
d, a, n = compute_monthly_payroll(30000, 20, 10.0, MONTH, YEAR)
assert a > 0 and n > 0, f"FAIL T4: a={a}, n={n}"
print(f"PASS T4 - 20 days + 10h overtime:   deductions={d:10.2f}  allowances={a:.2f}  net={n:10.2f}")

# Test 5: net never negative (even with 0 days and data inconsistency)
d, a, n = compute_monthly_payroll(30000, 0, 0, MONTH, YEAR)
assert n >= 0, f"FAIL T5: Negative net {n}"
print(f"PASS T5 - Net never negative:        deductions={d:10.2f}  net={n:10.2f}")

# Test 6: Zero base salary edge case
d, a, n = compute_monthly_payroll(0, 15, 0, MONTH, YEAR)
assert d == 0.0 and n == 0.0, f"FAIL T6: d={d}, n={n}"
print(f"PASS T6 - Zero base salary:          deductions={d:10.2f}  net={n:10.2f}")

print("\nAll 6 formula tests PASSED.")
