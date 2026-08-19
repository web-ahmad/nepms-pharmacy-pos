"""Copy the local SQLite database into Supabase (PostgreSQL).

    python scripts/migrate_sqlite_to_supabase.py --check
    python scripts/migrate_sqlite_to_supabase.py --run

Reads the source from --sqlite (default ./nepms_local.db) and the target from
TARGET_DATABASE_URL, falling back to DATABASE_URL.

Why this isn't just "insert every table in order":

* Five tables (tenants, pharmacies, departments, designations, employees) form a
  foreign-key cycle, so no insertion order satisfies Postgres. SQLite never
  enforced foreign keys at all, so the data may also contain orphan rows that
  Postgres would reject. Both are handled by dropping every FK constraint up
  front and restoring them at the end -- any constraint that then refuses to
  come back is reported with its error rather than silently skipped.
* SQLite stores whatever it is given: '1' in a Boolean, a string in an Integer,
  a text timestamp in a DateTime. Postgres rejects all of those, so values are
  coerced according to the column type declared on the model.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import (
    Boolean, Date, DateTime, Float, Integer, Numeric,
    create_engine, insert, select, text,
)

load_dotenv()

BATCH = 500
TRUE_STRINGS = {"1", "true", "t", "yes", "y", "on"}
FALSE_STRINGS = {"0", "false", "f", "no", "n", "off", ""}
DATETIME_FORMATS = (
    "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d",
)


def coerce(value, column):
    """Bend one SQLite value into something the Postgres column will accept."""
    if value is None:
        return None
    t = column.type

    if isinstance(t, Boolean):
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        s = str(value).strip().lower()
        if s in TRUE_STRINGS:
            return True
        if s in FALSE_STRINGS:
            return None if s == "" else False
        return None

    if isinstance(t, Integer):
        if isinstance(value, bool):
            return int(value)
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None

    if isinstance(t, (Numeric, Float)):
        try:
            return float(value) if isinstance(t, Float) else Decimal(str(value))
        except (TypeError, ValueError, InvalidOperation):
            return None

    if isinstance(t, DateTime):
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value
        if isinstance(value, date):
            return datetime(value.year, value.month, value.day)
        s = str(value).strip().replace("Z", "")
        for fmt in DATETIME_FORMATS:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None

    if isinstance(t, Date):
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        s = str(value).strip()
        for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None

    # Strings: trim to the declared length rather than letting the insert fail.
    length = getattr(t, "length", None)
    if length and isinstance(value, str) and len(value) > length:
        return value[:length]
    return value


def load_metadata():
    import models  # noqa: F401  -- importing registers every model on Base
    from database import Base
    return Base.metadata


def drop_foreign_keys(pg):
    """Remove every FK so rows can go in in any order. Returns DDL to restore them."""
    rows = pg.execute(text("""
        SELECT c.conrelid::regclass::text AS tbl, c.conname, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.contype = 'f' AND n.nspname = 'public'
    """)).all()
    for tbl, name, _ in rows:
        pg.execute(text(f'ALTER TABLE {tbl} DROP CONSTRAINT "{name}"'))
    pg.commit()
    return [(tbl, name, ddl) for tbl, name, ddl in rows]


def restore_foreign_keys(pg, saved):
    """Put the FKs back. A failure here means real orphan rows in the source."""
    failed = []
    for tbl, name, ddl in saved:
        try:
            pg.execute(text(f'ALTER TABLE {tbl} ADD CONSTRAINT "{name}" {ddl}'))
            pg.commit()
        except Exception as exc:
            pg.rollback()
            failed.append((tbl, name, str(exc).split("\n")[0][:160]))
    return failed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sqlite", default="sqlite:///./nepms_local.db")
    ap.add_argument("--target", default=os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL"))
    ap.add_argument("--check", action="store_true", help="Connect and report, change nothing")
    ap.add_argument("--run", action="store_true", help="Create schema and copy data")
    ap.add_argument("--truncate", action="store_true", help="Empty target tables before copying")
    args = ap.parse_args()

    if not args.target or args.target.startswith("sqlite"):
        sys.exit("Target must be a PostgreSQL URL. Set TARGET_DATABASE_URL or pass --target.")

    from database import _normalise_pg_url
    target = _normalise_pg_url(args.target)

    metadata = load_metadata()
    src = create_engine(args.sqlite)
    dst = create_engine(target, pool_pre_ping=True, connect_args={"connect_timeout": 15})

    with dst.connect() as pg:
        version = pg.execute(text("SELECT version()")).scalar()
        print(f"target : {version.split(',')[0]}")
    with src.connect() as lite:
        names = {r[0] for r in lite.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))}
    print(f"source : {len(names)} tables in SQLite, {len(metadata.tables)} defined on the models")

    tables = [t for t in metadata.sorted_tables if t.name in names]
    missing = sorted(t.name for t in metadata.sorted_tables if t.name not in names)
    if missing:
        shown = ", ".join(missing[:6]) + (" ..." if len(missing) > 6 else "")
        print(f"note   : {len(missing)} model tables absent from SQLite (created empty): {shown}")

    if args.check:
        with src.connect() as lite:
            total = sum(lite.execute(text(f'SELECT COUNT(*) FROM "{t.name}"')).scalar() or 0 for t in tables)
        print(f"check  : {total} rows would be copied across {len(tables)} tables. Nothing written.")
        return

    if not args.run:
        sys.exit("Pass --check to inspect or --run to migrate.")

    print("\n1/4 creating schema ...")
    metadata.create_all(bind=dst, checkfirst=True)

    print("2/4 dropping foreign keys for the load ...")
    copied, skipped, failed = {}, [], []
    with dst.connect() as pg:
        saved = drop_foreign_keys(pg)
        print(f"      {len(saved)} constraints set aside")

        if args.truncate:
            for t in reversed(tables):
                pg.execute(text(f'TRUNCATE TABLE "{t.name}" CASCADE'))
            pg.commit()
            print("      target tables truncated")

        print("3/4 copying rows ...")
        with src.connect() as lite:
            for t in tables:
                rows = lite.execute(select(t)).mappings().all()
                if not rows:
                    continue
                payload = [{c.name: coerce(r.get(c.name), c) for c in t.columns} for r in rows]
                done = 0
                for i in range(0, len(payload), BATCH):
                    chunk = payload[i:i + BATCH]
                    try:
                        pg.execute(insert(t), chunk)
                        pg.commit()
                        done += len(chunk)
                    except Exception:
                        pg.rollback()
                        # Retry row by row so one bad record can't lose the batch.
                        for row in chunk:
                            try:
                                pg.execute(insert(t), [row])
                                pg.commit()
                                done += 1
                            except Exception as row_exc:
                                pg.rollback()
                                skipped.append((t.name, str(row_exc).split("\n")[0][:120]))
                copied[t.name] = done
                print(f"      {t.name:38} {done}/{len(rows)}")

        print("\n4/4 restoring foreign keys ...")
        failed = restore_foreign_keys(pg, saved)

    print(f"\ncopied  : {sum(copied.values())} rows into {len(copied)} tables")
    if skipped:
        print(f"skipped : {len(skipped)} rows could not be inserted")
        for name, err in skipped[:10]:
            print(f"          {name}: {err}")
    if failed:
        print(f"WARNING : {len(failed)} foreign keys could not be restored (orphan rows in the source):")
        for tbl, name, err in failed[:10]:
            print(f"          {tbl}.{name}: {err}")
        print("          Those constraints are NOT enforced on the target until the orphans are fixed.")
    else:
        print("foreign keys: all restored cleanly")


if __name__ == "__main__":
    main()
