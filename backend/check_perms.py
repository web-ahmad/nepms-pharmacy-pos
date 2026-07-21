import sqlite3
conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE username = 'alisaab'")
print(cursor.fetchall())
conn.close()
