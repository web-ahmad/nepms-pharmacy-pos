import sqlite3
conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
print('warehouse_racks in tables:', 'warehouse_racks' in tables)
print('stock_transfers in tables:', 'stock_transfers' in tables)
print('inventory_reservations in tables:', 'inventory_reservations' in tables)
