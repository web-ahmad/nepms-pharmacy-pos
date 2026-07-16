import sys
sys.path.insert(0, '.')
from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    cols = db.execute(text('PRAGMA table_info(pharmacy_branches)')).fetchall()
    col_names = [c[1] for c in cols]
    
    if 'legacy_branch_id' not in col_names:
        db.execute(text('ALTER TABLE pharmacy_branches ADD COLUMN legacy_branch_id VARCHAR(36)'))
        db.commit()
        print('OK: Added legacy_branch_id column')
    else:
        print('OK: Column already exists')
    
    print()
    print('Current pharmacy_branches:')
    rows = db.execute(text('SELECT id, name, legacy_branch_id FROM pharmacy_branches')).fetchall()
    for r in rows:
        print('  id=' + str(r[0]) + '  name=' + str(r[1]) + '  legacy=' + str(r[2]))
    
    print()
    print('POS branch_ids in sales:')
    bids = db.execute(text('SELECT branch_id, COUNT(*) as cnt FROM sales GROUP BY branch_id ORDER BY cnt DESC')).fetchall()
    for r in bids:
        print('  branch_id=' + str(r[0]) + '  count=' + str(r[1]))

except Exception as e:
    print('ERROR: ' + str(e))
    db.rollback()
finally:
    db.close()
