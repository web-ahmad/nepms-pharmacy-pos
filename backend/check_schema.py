import sqlite3
conn = sqlite3.connect('nepms.db')
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='medicines';")
print(cursor.fetchone()[0])
