"""
Schema migration: branch-isolate petty cash categories (each branch its own list).

The branch_id column already exists on petty_cash_categories, so this only:
 - Backfills existing (tenant-shared) categories to their tenant's MAIN branch.
 - Adds a composite unique index (name, tenant_id, branch_id).

Safe to re-run.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "nepms_local.db")


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

    cur.execute("SELECT DISTINCT tenant_id FROM petty_cash_categories WHERE branch_id IS NULL AND tenant_id IS NOT NULL")
    tenants = [r[0] for r in cur.fetchall()]
    backfilled = 0
    for t in tenants:
        b = branch_for(t)
        if b:
            cur.execute("UPDATE petty_cash_categories SET branch_id=? WHERE tenant_id=? AND branch_id IS NULL", (b, t))
            backfilled += cur.rowcount
    if backfilled:
        print(f"petty_cash_categories: backfilled {backfilled} rows to main branch")

    if not index_exists(cur, "uq_petty_cash_categories_name_tenant_branch"):
        cur.execute("CREATE UNIQUE INDEX uq_petty_cash_categories_name_tenant_branch ON petty_cash_categories (name, tenant_id, branch_id)")
        print("petty_cash_categories: created uq_petty_cash_categories_name_tenant_branch (name, tenant_id, branch_id)")
    if not index_exists(cur, "ix_petty_cash_categories_branch_id"):
        cur.execute("CREATE INDEX ix_petty_cash_categories_branch_id ON petty_cash_categories (branch_id)")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
