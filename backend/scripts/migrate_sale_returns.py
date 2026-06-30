import sqlite3
import os

# Find database path
db_path = 'nepms_local.db'
if not os.path.exists(db_path) and os.path.exists('../nepms_local.db'):
    db_path = '../nepms_local.db'
elif not os.path.exists(db_path) and os.path.exists('backend/nepms_local.db'):
    db_path = 'backend/nepms_local.db'

print(f"Connecting to database at: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Update sale_returns columns if they don't exist
columns_to_add = [
    ("cashier_id", "VARCHAR(36)"),
    ("payment_mode", "VARCHAR(50) DEFAULT 'Cash'"),
    ("notes", "TEXT"),
    ("reason", "VARCHAR(255)")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE sale_returns ADD COLUMN {col_name} {col_type}")
        conn.commit()
        print(f"Column '{col_name}' successfully added to 'sale_returns' table.")
    except Exception as e:
        print(f"Notice (Column '{col_name}' in 'sale_returns'): {e}")

# 2. Create sale_return_items table
create_items_table_sql = """
CREATE TABLE IF NOT EXISTS sale_return_items (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36),
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME,
    
    sale_return_id VARCHAR(36) NOT NULL,
    sale_item_id VARCHAR(36) NOT NULL,
    medicine_id VARCHAR(36) NOT NULL,
    quantity_returned INTEGER NOT NULL,
    return_reason VARCHAR(255),
    stock_action VARCHAR(50) DEFAULT 'Returned to Stock',
    unit_price FLOAT DEFAULT 0.0,
    total_refund FLOAT DEFAULT 0.0,
    FOREIGN KEY (sale_return_id) REFERENCES sale_returns (id),
    FOREIGN KEY (sale_item_id) REFERENCES sale_items (id),
    FOREIGN KEY (medicine_id) REFERENCES medicines (id)
);
"""

try:
    cursor.execute(create_items_table_sql)
    conn.commit()
    print("Table 'sale_return_items' successfully verified/created.")
except Exception as e:
    print("Error creating 'sale_return_items' table:", e)

# 3. Check table schema for verification
try:
    cursor.execute("PRAGMA table_info(sale_returns)")
    print("\n'sale_returns' columns:")
    for row in cursor.fetchall():
        print(f" - {row[1]} ({row[2]})")

    cursor.execute("PRAGMA table_info(sale_return_items)")
    print("\n'sale_return_items' columns:")
    for row in cursor.fetchall():
        print(f" - {row[1]} ({row[2]})")
except Exception as e:
    print("Error inspecting tables:", e)

conn.close()
print("Migration completed.")
