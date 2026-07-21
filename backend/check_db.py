import sqlite3
conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
tenant_id = 'fb661464-9d0e-4f9c-a50a-186526545cdd'
cursor.execute("SELECT created_at FROM sales WHERE status = 'Completed' AND tenant_id = ?", (tenant_id,))
print(cursor.fetchall())
conn.close()
