import sqlite3
for db_path in ['nepms_local.db', 'backend/nepms_local.db']:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT id, margin_percent, cost_per_base_unit FROM medicines")
        rows = cur.fetchall()
        for row in rows:
            if not isinstance(row[1], (int, float, type(None))) or not isinstance(row[2], (int, float, type(None))):
                print(f"{db_path} - ID {row[0]}: margin={repr(row[1])}, cost={repr(row[2])}")
    except Exception as e:
        print(db_path, "Error:", e)
