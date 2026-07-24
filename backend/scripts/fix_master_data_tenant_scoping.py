"""
One-off, additive schema fix (not a destructive reseed):

Master data tables (master_generics, master_categories, master_manufacturers,
etc.) and Medicine.barcode/sku had globally unique DB indexes on `name` /
`barcode` / `sku` with no tenant scoping — so two different pharmacies could
never both have, e.g., a generic named "Paracetamol". This drops those global
unique indexes and replaces them with composite (column, tenant_id) unique
indexes, matching the corrected SQLAlchemy models in
models/master_data.py and models/inventory.py.

Safe to re-run: every step checks current state before acting.
"""
import sqlite3
import sys
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "nepms_local.db")

MASTER_TABLES = [
    "master_age_groups", "master_bins", "master_brands", "master_categories",
    "master_dosage_forms", "master_flavors", "master_generics",
    "master_manufacturers", "master_packaging", "master_prescription_types",
    "master_racks", "master_routes", "master_shelves",
    "master_storage_conditions", "master_strength_units", "master_strengths",
    "master_suppliers", "master_tax_rules", "master_units", "master_warehouses",
]


def index_exists(cur, name):
    cur.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,))
    return cur.fetchone() is not None


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for table in MASTER_TABLES:
        cur.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if not cur.fetchone():
            print(f"skip {table}: table does not exist")
            continue

        old_index = f"ix_{table}_name"
        new_index = f"uq_{table}_name_tenant"

        if index_exists(cur, old_index):
            cur.execute(f"DROP INDEX {old_index}")
            print(f"{table}: dropped global unique index {old_index}")

        if not index_exists(cur, new_index):
            cur.execute(f"CREATE UNIQUE INDEX {new_index} ON {table} (name, tenant_id)")
            print(f"{table}: created composite unique index {new_index} (name, tenant_id)")
        else:
            print(f"{table}: {new_index} already exists, skipping")

        # Non-unique index on name is still useful for lookups/sorts.
        plain_index = f"ix_{table}_name_lookup"
        if not index_exists(cur, plain_index):
            cur.execute(f"CREATE INDEX {plain_index} ON {table} (name)")

    # Medicine.barcode / Medicine.sku: same global -> per-tenant fix.
    if index_exists(cur, "ix_medicines_barcode"):
        cur.execute("DROP INDEX ix_medicines_barcode")
        print("medicines: dropped global unique index ix_medicines_barcode")
    if not index_exists(cur, "uq_medicines_barcode_tenant"):
        cur.execute("CREATE UNIQUE INDEX uq_medicines_barcode_tenant ON medicines (barcode, tenant_id)")
        print("medicines: created composite unique index uq_medicines_barcode_tenant (barcode, tenant_id)")
    if not index_exists(cur, "ix_medicines_barcode_lookup"):
        cur.execute("CREATE INDEX ix_medicines_barcode_lookup ON medicines (barcode)")

    if index_exists(cur, "ix_medicines_sku"):
        cur.execute("DROP INDEX ix_medicines_sku")
        print("medicines: dropped global unique index ix_medicines_sku")
    if not index_exists(cur, "uq_medicines_sku_tenant"):
        cur.execute("CREATE UNIQUE INDEX uq_medicines_sku_tenant ON medicines (sku, tenant_id)")
        print("medicines: created composite unique index uq_medicines_sku_tenant (sku, tenant_id)")
    if not index_exists(cur, "ix_medicines_sku_lookup"):
        cur.execute("CREATE INDEX ix_medicines_sku_lookup ON medicines (sku)")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
