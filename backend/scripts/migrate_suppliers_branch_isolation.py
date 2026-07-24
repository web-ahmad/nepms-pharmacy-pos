"""
Schema migration: make Suppliers BRANCH-isolated (each branch its own island).

Mirrors the master-data branch-isolation migration:
 - Add a `branch_id` column to the suppliers table.
 - Backfill existing (previously tenant-shared) suppliers to their tenant's MAIN
   branch, so Main keeps them and other branches start empty.
 - Add a composite unique index (name, tenant_id, branch_id).

Safe to re-run: every step checks current state first.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "nepms_local.db")


def col_exists(cur, table, col):
    cur.execute(f"PRAGMA table_info({table})")
    return any(r[1] == col for r in cur.fetchall())


def index_exists(cur, name):
    cur.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?", (name,))
    return cur.fetchone() is not None


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # tenant -> main branch (fallback: any branch)
    cur.execute("SELECT tenant_id, id, is_main FROM branches WHERE tenant_id IS NOT NULL")
    tenant_main, tenant_any = {}, {}
    for tenant_id, bid, is_main in cur.fetchall():
        tenant_any.setdefault(tenant_id, bid)
        if is_main:
            tenant_main[tenant_id] = bid

    def branch_for(t):
        return tenant_main.get(t) or tenant_any.get(t)

    if not col_exists(cur, "suppliers", "branch_id"):
        cur.execute("ALTER TABLE suppliers ADD COLUMN branch_id VARCHAR(36)")
        print("suppliers: added branch_id column")

    cur.execute("SELECT DISTINCT tenant_id FROM suppliers WHERE branch_id IS NULL AND tenant_id IS NOT NULL")
    tenants = [r[0] for r in cur.fetchall()]
    backfilled = 0
    for t in tenants:
        b = branch_for(t)
        if b:
            cur.execute("UPDATE suppliers SET branch_id=? WHERE tenant_id=? AND branch_id IS NULL", (b, t))
            backfilled += cur.rowcount
    if backfilled:
        print(f"suppliers: backfilled {backfilled} rows to main branch")

    if not index_exists(cur, "uq_suppliers_name_tenant_branch"):
        cur.execute("CREATE UNIQUE INDEX uq_suppliers_name_tenant_branch ON suppliers (name, tenant_id, branch_id)")
        print("suppliers: created uq_suppliers_name_tenant_branch (name, tenant_id, branch_id)")
    if not index_exists(cur, "ix_suppliers_branch_id"):
        cur.execute("CREATE INDEX ix_suppliers_branch_id ON suppliers (branch_id)")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
