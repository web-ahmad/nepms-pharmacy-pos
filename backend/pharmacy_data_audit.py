"""
pharmacy_data_audit.py — audits row counts per pharmacy before rename/delete decisions.
Run: python pharmacy_data_audit.py
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import sqlite3
from database import engine

db_url = str(engine.url).replace('sqlite:///', '').replace('sqlite://', '')
conn = sqlite3.connect(db_url)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

pharmacies = cur.execute('SELECT id, name, tenant_id FROM pharmacies').fetchall()
for p in pharmacies:
    print(f'PHARMACY: {p["name"]}  id={p["id"]}  tenant={p["tenant_id"]}')
print()

all_tables = [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('pharmacies','super_admins','alembic_version')"
).fetchall()]

IMPORTANT_TABLES = {
    'sales', 'sale_items', 'sale_returns', 'purchase_orders', 'purchase_invoices',
    'grns', 'batches', 'medicines', 'employees', 'users', 'customers',
    'cash_sessions', 'journal_entries', 'stock_movements', 'payroll_runs',
    'audit_events', 'alert_history', 'camera_snapshots',
}

for pharm in pharmacies:
    pid = pharm['id']
    pname = pharm['name']
    print(f'=== [{pname}]  (id={pid}) ===')
    important = []
    reference = []
    for t in sorted(all_tables):
        cols = [r[1] for r in cur.execute(f'PRAGMA table_info("{t}")').fetchall()]
        if 'pharmacy_id' not in cols:
            continue
        count = cur.execute(f'SELECT COUNT(*) FROM "{t}" WHERE pharmacy_id=?', (pid,)).fetchone()[0]
        if count > 0:
            if t in IMPORTANT_TABLES:
                important.append((t, count))
            else:
                reference.append((t, count))
    if important:
        print('  [TRANSACTIONAL / IMPORTANT]:')
        for t, c in important:
            print(f'    {t:<40} {c:>6} rows')
    if reference:
        print('  [Reference / Config data]:')
        for t, c in reference:
            print(f'    {t:<40} {c:>6} rows')
    if not important and not reference:
        print('  (no data rows)')
    print()

conn.close()
