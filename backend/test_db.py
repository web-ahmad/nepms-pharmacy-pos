import sys
sys.path.append('C:/Users/DEVJiX/Desktop/NEPMS/backend')
from sqlalchemy import create_engine, text

engine = create_engine('sqlite:///C:/Users/DEVJiX/Desktop/NEPMS/backend/nepms_local.db')
with engine.connect() as conn:
    print('Recent medicines:')
    res = conn.execute(text('SELECT id, name FROM medicines ORDER BY created_at DESC LIMIT 5')).fetchall()
    for row in res:
        print(row)
        batches = conn.execute(text(f"SELECT id, branch_id FROM batches WHERE medicine_id = '{row[0]}';")).fetchall()
        print('  Batches:', batches)
