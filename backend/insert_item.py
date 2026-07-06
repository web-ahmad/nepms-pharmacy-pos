import sqlite3
import uuid

conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
cursor.execute("SELECT id, branch_id FROM sales WHERE invoice_number='INV-1016'")
sale = cursor.fetchone()

if sale:
    sale_id = sale[0]
    cursor.execute("SELECT id FROM medicines LIMIT 1")
    med = cursor.fetchone()
    
    if med:
        medicine_id = med[0]
        # Insert a fake sale_item
        item_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO sale_items (id, sale_id, medicine_id, quantity, unit_price, total, discount, tax, is_deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (item_id, sale_id, medicine_id, 2, 50.0, 100.0, 0, 0, False))
        conn.commit()
        print("Inserted item successfully for INV-1016")

conn.close()
