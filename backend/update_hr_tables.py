import sqlite3

db_path = r"c:\Users\DEVJiX\Desktop\New folder\backend\nepms_local.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("ALTER TABLE employees ADD COLUMN weekend_days JSON DEFAULT '[]'")
    print("Added weekend_days to employees")
except sqlite3.OperationalError as e:
    print(e)

try:
    c.execute("ALTER TABLE employees ADD COLUMN overtime_allowed BOOLEAN DEFAULT 0")
    print("Added overtime_allowed to employees")
except sqlite3.OperationalError as e:
    print(e)

try:
    c.execute("ALTER TABLE employees ADD COLUMN standard_break_time INTEGER DEFAULT 60")
    print("Added standard_break_time to employees")
except sqlite3.OperationalError as e:
    print(e)

try:
    c.execute("""
    CREATE TABLE IF NOT EXISTS holidays (
        id VARCHAR PRIMARY KEY,
        tenant_id VARCHAR,
        date DATE,
        name VARCHAR
    )
    """)
    print("Created holidays table")
except sqlite3.OperationalError as e:
    print(e)

conn.commit()
conn.close()
