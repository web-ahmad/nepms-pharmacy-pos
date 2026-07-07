import sqlite3

def check_schema():
    conn = sqlite3.connect("backend/nepms_local.db")
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(employees)")
    columns = cursor.fetchall()
    for col in columns:
        print(col[1])
    conn.close()

if __name__ == "__main__":
    check_schema()
