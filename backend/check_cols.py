import sqlite3
conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(batches);")
cols = [t[1] for t in cursor.fetchall()]
print('warehouse_id in batches:', 'warehouse_id' in cols)
