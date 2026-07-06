import sqlite3

conn = sqlite3.connect('nepms_local.db')

migrations = [
    "ALTER TABLE invoice_settings ADD COLUMN show_payment_method BOOLEAN DEFAULT 1",
    "ALTER TABLE invoice_settings ADD COLUMN show_ntn BOOLEAN DEFAULT 0",
    "ALTER TABLE invoice_settings ADD COLUMN business_name VARCHAR DEFAULT 'NEPMS Pharmacy'",
    "ALTER TABLE invoice_settings ADD COLUMN business_address VARCHAR DEFAULT 'Plot 12-C, Commercial Area, Sector G-10'",
    "ALTER TABLE invoice_settings ADD COLUMN business_phone VARCHAR DEFAULT '+92-51-1234567'",
    "ALTER TABLE invoice_settings ADD COLUMN business_ntn VARCHAR",
]

for sql in migrations:
    col = sql.split("ADD COLUMN ")[1].split(" ")[0]
    try:
        conn.execute(sql)
        print("Added: " + col)
    except Exception as e:
        print("Skip " + col + ": " + str(e))

conn.commit()

# Verify
cur = conn.cursor()
cur.execute("PRAGMA table_info(invoice_settings)")
cols = [r[1] for r in cur.fetchall()]
print("\nFinal columns:", cols)

conn.close()
print("\nMigration complete.")
