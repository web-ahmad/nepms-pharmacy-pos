"""
pharmacy_id_repair.py
─────────────────────
Direct SQLite script to:
1. Verify pharmacies table and seed data
2. Add pharmacy_id column to all tables that missed it (using raw SQLite)
3. Backfill all rows
4. Report final status

Run from backend/ directory:
    python pharmacy_id_repair.py
"""

import sqlite3
import uuid
from datetime import datetime
import sys
import io
# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DB_PATH = "nepms.db"  # adjust if your DB file has a different name

# ── Find actual DB file ─────────────────────────────────────────────────────
import os
import sys

# Try to find the DB from the SQLAlchemy config
try:
    sys.path.insert(0, os.path.dirname(__file__))
    from database import engine
    db_url = str(engine.url)
    if "sqlite:///" in db_url:
        DB_PATH = db_url.replace("sqlite:///", "").replace("sqlite://", "")
        if not os.path.isabs(DB_PATH):
            DB_PATH = os.path.join(os.path.dirname(__file__), DB_PATH)
    print(f"Using DB: {DB_PATH}")
except Exception as e:
    print(f"Could not auto-detect DB path: {e}. Using default: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("PRAGMA foreign_keys = OFF")
cur.execute("PRAGMA journal_mode = WAL")

now = datetime.utcnow().isoformat()


# ── Step 1: Verify pharmacies table ────────────────────────────────────────
rows = cur.execute("SELECT * FROM pharmacies").fetchall()
print(f"\n✅ pharmacies table has {len(rows)} row(s):")
pharmacy_ids = []
for r in rows:
    print(f"   id={r['id']}  name={r['name']}  tenant_id={r['tenant_id']}")
    pharmacy_ids.append(r['id'])

if not pharmacy_ids:
    seed_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO pharmacies (id, name, subscription_status, is_active, created_at) VALUES (?,?,?,?,?)",
        (seed_id, "My Pharmacy", "active", 1, now)
    )
    pharmacy_ids.append(seed_id)
    print(f"   → Inserted seed pharmacy: {seed_id}")

# Map tenant_id → pharmacy_id
tenant_map = {}
for r in cur.execute("SELECT id, tenant_id FROM pharmacies WHERE tenant_id IS NOT NULL").fetchall():
    tenant_map[r['tenant_id']] = r['id']
print(f"\n   Tenant→Pharmacy map: {tenant_map}")
default_pharmacy_id = pharmacy_ids[0]


# ── Step 2: Get all existing table names ──────────────────────────────────
all_tables = [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version'"
).fetchall()]

SKIP_TABLES = {'pharmacies', 'super_admins'}

# ── Step 3: Add pharmacy_id and backfill ──────────────────────────────────
added = []
already_had = []
failed = []

for table in sorted(all_tables):
    if table in SKIP_TABLES:
        continue

    # Check if pharmacy_id already exists
    existing_cols = [r[1] for r in cur.execute(f"PRAGMA table_info('{table}')").fetchall()]
    if 'pharmacy_id' in existing_cols:
        # Backfill any NULLs
        if 'tenant_id' in existing_cols:
            for tid, pid in tenant_map.items():
                cur.execute(f"UPDATE {table} SET pharmacy_id = ? WHERE tenant_id = ? AND pharmacy_id IS NULL", (pid, tid))
        cur.execute(f"UPDATE {table} SET pharmacy_id = ? WHERE pharmacy_id IS NULL", (default_pharmacy_id,))
        already_had.append(table)
        continue

    # Add the column
    try:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN pharmacy_id TEXT REFERENCES pharmacies(id)")
        # Backfill
        if 'tenant_id' in existing_cols:
            for tid, pid in tenant_map.items():
                cur.execute(f"UPDATE {table} SET pharmacy_id = ? WHERE tenant_id = ?", (pid, tid))
        # Fill remaining NULLs with default
        cur.execute(f"UPDATE {table} SET pharmacy_id = ? WHERE pharmacy_id IS NULL", (default_pharmacy_id,))
        added.append(table)
    except Exception as e:
        failed.append((table, str(e)))

conn.commit()

# ── Step 4: Report ────────────────────────────────────────────────────────
print(f"\n📊 RESULTS")
print(f"   ✅ pharmacy_id ADDED  ({len(added)} tables): {added}")
print(f"   ✓  Already had it    ({len(already_had)} tables): {already_had}")
if failed:
    print(f"   ❌ Failed           ({len(failed)} tables):")
    for t, e in failed:
        print(f"      {t}: {e}")
else:
    print(f"   ❌ Failed: none")

# ── Step 5: Verify final state ────────────────────────────────────────────
print(f"\n🔍 VERIFICATION (tables still missing pharmacy_id):")
missing = []
for table in sorted(all_tables):
    if table in SKIP_TABLES:
        continue
    existing_cols = [r[1] for r in cur.execute(f"PRAGMA table_info('{table}')").fetchall()]
    if 'pharmacy_id' not in existing_cols:
        missing.append(table)
if missing:
    for t in missing:
        print(f"   ❌ {t}")
else:
    print("   ✅ All tables have pharmacy_id")

# ── Step 6: NULL check ────────────────────────────────────────────────────
print(f"\n🔍 NULL pharmacy_id counts:")
for table in sorted(all_tables):
    if table in SKIP_TABLES:
        continue
    existing_cols = [r[1] for r in cur.execute(f"PRAGMA table_info('{table}')").fetchall()]
    if 'pharmacy_id' not in existing_cols:
        continue
    null_count = cur.execute(f"SELECT COUNT(*) FROM {table} WHERE pharmacy_id IS NULL").fetchone()[0]
    total = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    if null_count > 0:
        print(f"   ⚠️  {table}: {null_count}/{total} NULL")
    else:
        print(f"   ✅ {table}: {total} rows, all backfilled")

conn.close()
print("\n✅ Done.")
