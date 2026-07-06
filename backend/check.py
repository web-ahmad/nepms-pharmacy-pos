import sqlite3
conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
cursor.execute("SELECT id FROM sales WHERE invoice_number='INV-1016'")
sale = cursor.fetchone()
print('Sale:', sale)
if sale:
    cursor.execute(f"SELECT * FROM sale_items WHERE sale_id='{sale[0]}'")
    print('Items:', cursor.fetchall())
conn.close()
