"""
Schema migration: branch-isolate customers (each branch its own customer list).

 - Add a `branch_id` column to the customers table.
 - Backfill existing (tenant-shared) customers to their tenant's MAIN branch.
 - Replace the global UNIQUE index on `cnic` with a composite
   (cnic, tenant_id, branch_id) so the same CNIC can exist per branch.

Safe to re-run.
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

    cur.execute("SELECT tenant_id, id, is_main FROM branches WHERE tenant_id IS NOT NULL")
    tenant_main, tenant_any = {}, {}
    for tenant_id, bid, is_main in cur.fetchall():
        tenant_any.setdefault(tenant_id, bid)
        if is_main:
            tenant_main[tenant_id] = bid

    def branch_for(t):
        return tenant_main.get(t) or tenant_any.get(t)

    if not col_exists(cur, "customers", "branch_id"):
        cur.execute("ALTER TABLE customers ADD COLUMN branch_id VARCHAR(36)")
        print("customers: added branch_id column")

    cur.execute("SELECT DISTINCT tenant_id FROM customers WHERE branch_id IS NULL AND tenant_id IS NOT NULL")
    tenants = [r[0] for r in cur.fetchall()]
    backfilled = 0
    for t in tenants:
        b = branch_for(t)
        if b:
            cur.execute("UPDATE customers SET branch_id=? WHERE tenant_id=? AND branch_id IS NULL", (b, t))
            backfilled += cur.rowcount
    if backfilled:
        print(f"customers: backfilled {backfilled} rows to main branch")

    # Swap global CNIC unique for a composite (cnic, tenant_id, branch_id).
    if index_exists(cur, "ix_customers_cnic"):
        cur.execute("DROP INDEX ix_customers_cnic")
        print("customers: dropped global unique index ix_customers_cnic")
    if not index_exists(cur, "ix_customers_cnic_lookup"):
        cur.execute("CREATE INDEX ix_customers_cnic_lookup ON customers (cnic)")
    if not index_exists(cur, "uq_customers_cnic_tenant_branch"):
        cur.execute("CREATE UNIQUE INDEX uq_customers_cnic_tenant_branch ON customers (cnic, tenant_id, branch_id)")
        print("customers: created uq_customers_cnic_tenant_branch (cnic, tenant_id, branch_id)")
    if not index_exists(cur, "ix_customers_branch_id"):
        cur.execute("CREATE INDEX ix_customers_branch_id ON customers (branch_id)")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
