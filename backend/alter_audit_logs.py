from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE audit_logs ADD COLUMN reason_code VARCHAR(100)'))
    except Exception as e:
        print("reason_code already exists or error:", e)
    
    try:
        conn.execute(text('ALTER TABLE audit_logs ADD COLUMN batch_audit_id VARCHAR(36)'))
    except Exception as e:
        print("batch_audit_id already exists or error:", e)
        
    try:
        conn.execute(text('ALTER TABLE audit_logs ADD COLUMN severity VARCHAR(20) DEFAULT "Info"'))
    except Exception as e:
        print("severity already exists or error:", e)

    conn.commit()
    print("Migration finished!")
