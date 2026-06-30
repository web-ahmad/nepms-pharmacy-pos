import sqlite3
import os

# We run this from c:\Users\DEVJiX\Desktop\New folder\backend
db_path = 'nepms_local.db'

print(f"Connecting to DB at: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

new_cols = [
    ("strips_per_box", "INTEGER"),
    ("units_per_strip", "INTEGER"),
    ("volume_weight", "VARCHAR(100)")
]

for col_name, col_type in new_cols:
    try:
        cursor.execute(f"ALTER TABLE medicines ADD COLUMN {col_name} {col_type}")
        conn.commit()
        print(f"Column '{col_name}' successfully added to 'medicines' table.")
    except Exception as e:
        print(f"Notice (Column '{col_name}'):", e)

conn.close()
