import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'nepms_local.db')

conn = sqlite3.connect(db_path)
try:
    conn.execute('ALTER TABLE sales ADD COLUMN journal_entry_id VARCHAR(36) NULL;')
    print("Added journal_entry_id to sales table")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column journal_entry_id already exists in sales table")
    else:
        print(f"Error altering sales: {e}")

try:
    conn.execute('ALTER TABLE cash_ledger_entries ADD COLUMN journal_entry_id VARCHAR(36) NULL;')
    print("Added journal_entry_id to cash_ledger_entries table")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column journal_entry_id already exists in cash_ledger_entries table")
    else:
        print(f"Error altering cash_ledger_entries: {e}")

conn.commit()
conn.close()
