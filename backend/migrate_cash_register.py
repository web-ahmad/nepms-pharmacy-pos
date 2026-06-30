"""Safe migration: creates any missing tables without dropping existing ones."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from database import engine, Base
from models import *  # noqa: registers all models with metadata

print("Running safe create_all migration...")
Base.metadata.create_all(bind=engine)
print("Done. Verifying new tables...")

from sqlalchemy import inspect
ins = inspect(engine)
tables = ins.get_table_names()

for t in ['cash_sessions', 'cash_ledger_entries']:
    status = "OK" if t in tables else "MISSING"
    print(f"  {t}: {status}")

print("\nAll tables in DB:")
for t in sorted(tables):
    print(f"  {t}")
