import sqlite3 
conn = sqlite3.connect('nepms_local.db') 
try: 
    conn.execute('ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT 1;') 
    conn.commit() 
    print('Column added') 
except Exception as e: 
    print(e) 
finally: 
    conn.close() 
