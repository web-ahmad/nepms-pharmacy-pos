import sqlite3
import os

# We run this from c:\Users\DEVJiX\Desktop\New folder\backend
db_path = 'nepms_local.db'

print(f"Connecting to DB at: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE medicines ADD COLUMN shelf VARCHAR(100)")
    conn.commit()
    print("Column 'shelf' successfully added to 'medicines' table.")
except Exception as e:
    print("Notice:", e)
conn.close()
