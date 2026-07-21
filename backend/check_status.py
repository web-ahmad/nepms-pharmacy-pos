import sqlite3
conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
cursor.execute("SELECT status FROM sales WHERE tenant_id = 'fb661464-9d0e-4f9c-a50a-186526545cdd'")
print(cursor.fetchall())
conn.close()
