"""
Schema migration: make master data BRANCH-isolated (each branch its own island).

Per explicit user decision (reverses the earlier shared-catalog model):
 - Add a `branch_id` column to every master_* table.
 - Backfill existing (previously tenant-shared) rows to their tenant's MAIN
   branch, so the Main branch keeps its data and OTHER branches start empty.
 - Replace the (name, tenant_id) unique index with (name, tenant_id, branch_id)
   so the same name may exist independently in each branch.

Safe to re-run: each step checks current state before acting.
"""
import sqlite3
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


def col_exists(cur, table, col):
    cur.execute(f"PRAGMA table_info({table})")
    return any(r[1] == col for r in cur.fetchall())


def index_exists(cur, name):
    cur.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,))
    return cur.fetchone() is not None


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Map each tenant -> its main branch (fallback: any branch) for backfill.
    cur.execute("SELECT tenant_id, id, is_main FROM branches WHERE tenant_id IS NOT NULL")
    tenant_main = {}
    tenant_any = {}
    for tenant_id, bid, is_main in cur.fetchall():
        tenant_any.setdefault(tenant_id, bid)
        if is_main:
            tenant_main[tenant_id] = bid

    def branch_for(tenant_id):
        return tenant_main.get(tenant_id) or tenant_any.get(tenant_id)

    for table in MASTER_TABLES:
        cur.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if not cur.fetchone():
            print(f"skip {table}: table does not exist")
            continue

        # 1. Add branch_id column.
        if not col_exists(cur, table, "branch_id"):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN branch_id VARCHAR(36)")
            print(f"{table}: added branch_id column")

        # 2. Backfill existing rows to their tenant's main branch.
        cur.execute(f"SELECT DISTINCT tenant_id FROM {table} WHERE branch_id IS NULL AND tenant_id IS NOT NULL")
        tenants = [r[0] for r in cur.fetchall()]
        backfilled = 0
        for t in tenants:
            b = branch_for(t)
            if b:
                cur.execute(f"UPDATE {table} SET branch_id=? WHERE tenant_id=? AND branch_id IS NULL", (b, t))
                backfilled += cur.rowcount
        if backfilled:
            print(f"{table}: backfilled {backfilled} rows to main branch")

        # 3. Rebuild unique index to include branch_id.
        old_idx = f"uq_{table}_name_tenant"
        new_idx = f"uq_{table}_name_tenant_branch"
        if index_exists(cur, old_idx):
            cur.execute(f"DROP INDEX {old_idx}")
            print(f"{table}: dropped {old_idx}")
        if not index_exists(cur, new_idx):
            cur.execute(f"CREATE UNIQUE INDEX {new_idx} ON {table} (name, tenant_id, branch_id)")
            print(f"{table}: created {new_idx} (name, tenant_id, branch_id)")

        # Helpful lookup index on branch_id.
        bidx = f"ix_{table}_branch_id"
        if not index_exists(cur, bidx):
            cur.execute(f"CREATE INDEX {bidx} ON {table} (branch_id)")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
