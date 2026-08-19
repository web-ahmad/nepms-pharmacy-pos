"""Add columns that exist on the models but not yet in the database.

    python scripts/sync_schema.py --check
    python scripts/sync_schema.py --run

`Base.metadata.create_all()` -- which is what main.py runs at startup -- only
ever creates *missing tables*. It will not touch a table that already exists,
so any column added to a model after that table was first created is silently
absent from the database, and every query naming it fails with
"column ... does not exist".

On SQLite that was patched over by hand with one-off ALTER TABLE scripts. This
does the same job generically: diff the models against the live schema and add
whatever is missing, using the type the model declares.

Only ever ADDs nullable columns. It never drops, renames, or retypes anything,
so it is safe to run against a database with real data -- and it refuses to add
a NOT NULL column without a server default, since that cannot succeed on a
table that already has rows.
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn

load_dotenv()


def find_drift(engine, metadata):
    """Return (missing_tables, [(table, column)]) comparing models to the database."""
    insp = inspect(engine)
    live = set(insp.get_table_names())
    missing_tables, missing_columns = [], []

    for name, table in metadata.tables.items():
        if name not in live:
            missing_tables.append(name)
            continue
        have = {c["name"] for c in insp.get_columns(name)}
        for col in table.columns:
            if col.name not in have:
                missing_columns.append((table, col))
    return missing_tables, missing_columns


def add_column_sql(engine, table, column) -> str:
    """DDL for one column, rendered in the target dialect."""
    ddl = CreateColumn(column).compile(dialect=engine.dialect).string
    return f'ALTER TABLE "{table.name}" ADD COLUMN IF NOT EXISTS {ddl}'


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="Report drift, change nothing")
    ap.add_argument("--run", action="store_true", help="Add the missing columns")
    args = ap.parse_args()

    import models  # noqa: F401  -- registers every model on Base
    from database import Base, engine

    missing_tables, missing_columns = find_drift(engine, Base.metadata)

    print(f"database : {engine.url.render_as_string(hide_password=True)}")
    print(f"missing tables : {len(missing_tables)}")
    for name in missing_tables:
        print(f"   {name}")
    print(f"missing columns: {len(missing_columns)}")
    for table, col in missing_columns:
        print(f"   {table.name:34} {col.name:26} {col.type}")

    if not missing_tables and not missing_columns:
        print("\nschema is in sync with the models.")
        return

    if args.check or not args.run:
        if not args.check:
            print("\nPass --run to apply, or --check to acknowledge this is report-only.")
        else:
            print("\ncheck only -- nothing was written.")
        return

    if missing_tables:
        print(f"\ncreating {len(missing_tables)} missing tables ...")
        Base.metadata.create_all(bind=engine, checkfirst=True)

    unsafe = [
        (t, c) for t, c in missing_columns
        if not c.nullable and c.server_default is None
    ]
    if unsafe:
        print(f"\nrefusing to add {len(unsafe)} NOT NULL column(s) with no server default:")
        for t, c in unsafe:
            print(f"   {t.name}.{c.name} -- add a default or backfill it by hand")

    added, failed = 0, []
    with engine.connect() as conn:
        for table, col in missing_columns:
            if (table, col) in unsafe:
                continue
            try:
                conn.execute(text(add_column_sql(engine, table, col)))
                conn.commit()
                added += 1
                print(f"   added {table.name}.{col.name}")
            except Exception as exc:
                conn.rollback()
                failed.append((table.name, col.name, str(exc).splitlines()[0][:140]))

    print(f"\nadded {added} column(s)")
    for t, c, err in failed:
        print(f"   FAILED {t}.{c}: {err}")

    still_tables, still_cols = find_drift(engine, Base.metadata)
    print(f"remaining drift: {len(still_tables)} tables, {len(still_cols)} columns")


if __name__ == "__main__":
    main()
