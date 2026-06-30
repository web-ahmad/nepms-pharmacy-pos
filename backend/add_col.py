import sqlite3
conn = sqlite3.connect('nepms_local.db')
try:
    conn.execute('ALTER TABLE batches ADD COLUMN unit_selling_price FLOAT NULL;')
    conn.commit()
    print("Column added")
except Exception as e:
    print(e)
finally:
    conn.close()
