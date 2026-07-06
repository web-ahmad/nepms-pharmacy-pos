import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "backend", "nepms_local.db")
print("DB Path:", db_path)
if not os.path.exists(db_path):
    print("DB not found!")
else:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT username, is_active, is_deleted FROM users LIMIT 10;")
    users = cur.fetchall()
    print("Users:")
    for u in users:
        print(u)
    conn.close()
