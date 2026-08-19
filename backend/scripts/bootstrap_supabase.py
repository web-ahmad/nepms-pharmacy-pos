"""Bring an empty Supabase database up to a state the app can actually log into.

    python scripts/bootstrap_supabase.py --check     # connect and report only
    python scripts/bootstrap_supabase.py --run       # create schema, then seed

Three steps, in this order because each depends on the last:

    1. create_all  -- the 194 tables defined on the models
    2. seed_admin  -- a tenant plus the super-admin login
    3. seed_rbac   -- the enterprise permission catalogue and system roles

All three are idempotent, so re-running after a partial failure is safe.

This does NOT copy anything from nepms_local.db. Use
scripts/migrate_sqlite_to_supabase.py for that.
"""

from __future__ import annotations

import argparse
import os
import runpy
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import inspect, text

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)


def describe(engine) -> None:
    with engine.connect() as conn:
        version = conn.execute(text("SELECT version()")).scalar()
        who = conn.execute(text("SELECT current_user, current_database()")).first()
    print(f"  server   : {version.split(',')[0]}")
    print(f"  user/db  : {who[0]} @ {who[1]}")
    print(f"  tables   : {len(inspect(engine).get_table_names(schema='public'))} in public schema")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="Connect and report, change nothing")
    ap.add_argument("--run", action="store_true", help="Create schema and seed")
    args = ap.parse_args()

    url = os.getenv("DATABASE_URL", "")
    if not url:
        sys.exit("DATABASE_URL is not set. Put the Supabase connection string in backend/.env first.")
    if url.startswith("sqlite"):
        sys.exit(f"DATABASE_URL still points at SQLite ({url}). Point it at Supabase before bootstrapping.")

    import database  # reads DATABASE_URL at import time
    print(f"connecting to {database.SQLALCHEMY_DATABASE_URL.split('@')[-1]}")
    describe(database.engine)

    if args.check:
        print("\ncheck only -- nothing was written.")
        return
    if not args.run:
        sys.exit("Pass --check to inspect or --run to bootstrap.")

    import models  # noqa: F401  -- registers every model on Base
    from database import Base, engine

    print(f"\n1/3 creating schema ({len(Base.metadata.tables)} tables) ...")
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print(f"      now {len(inspect(engine).get_table_names(schema='public'))} tables in public")

    print("2/3 seeding tenant + super admin ...")
    runpy.run_path(os.path.join(BACKEND, "seed_admin.py"), run_name="__main__")

    print("3/3 seeding RBAC permissions + system roles ...")
    runpy.run_path(os.path.join(HERE, "seed_rbac.py"), run_name="__main__")

    with engine.connect() as conn:
        counts = {
            t: conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            for t in ("tenants", "users", "enterprise_permissions", "enterprise_roles")
        }
    print("\ndone. row counts:")
    for name, n in counts.items():
        print(f"      {name:26} {n}")
    print("\nLog in with the credentials seed_admin.py created, then change that password.")


if __name__ == "__main__":
    main()
