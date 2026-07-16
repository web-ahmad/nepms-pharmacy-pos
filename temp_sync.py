import sqlite3

def get_schema(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    schema = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        schema[table] = {row[1]: row[2] for row in cursor.fetchall()}
    conn.close()
    return schema

root_schema = get_schema('nepms_local.db')
backend_schema = get_schema('backend/nepms_local.db.backup')

missing_cols = []
for table, columns in backend_schema.items():
    if table not in root_schema:
        print(f'Missing table: {table}')
        conn = sqlite3.connect('backend/nepms_local.db.backup')
        cursor = conn.cursor()
        cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
        create_sql = cursor.fetchone()[0]
        conn.close()
        try:
            r_conn = sqlite3.connect('nepms_local.db')
            r_conn.execute(create_sql)
            r_conn.commit()
            r_conn.close()
            print(f'Created table {table}')
        except Exception as e:
            print(f'Failed to create table {table}: {e}')
        continue
        
    for col, col_type in columns.items():
        if col not in root_schema[table]:
            missing_cols.append((table, col, col_type))

conn = sqlite3.connect('nepms_local.db')
cursor = conn.cursor()
for table, col, col_type in missing_cols:
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        print(f"Added {col} to {table}")
    except Exception as e:
        print(f"Failed {col} to {table}: {e}")
conn.commit()
conn.close()
