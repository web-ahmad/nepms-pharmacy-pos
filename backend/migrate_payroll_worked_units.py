"""
Migration: Add missing 'worked_units' column to payroll_lines table.
"""
import sys
sys.path.insert(0, '.')
from database import engine
from sqlalchemy import text, inspect

def column_exists(table, column):
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns(table)]
    return column in cols

with engine.connect() as conn:
    if not column_exists("payroll_lines", "worked_units"):
        conn.execute(text("ALTER TABLE payroll_lines ADD COLUMN worked_units VARCHAR NULL"))
        print("DONE: Added 'worked_units' column to payroll_lines")
    else:
        print("INFO: 'worked_units' already exists in payroll_lines")

    conn.commit()
    print("Migration complete.")
    
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("payroll_lines")]
    print(f"payroll_lines columns: {cols}")
