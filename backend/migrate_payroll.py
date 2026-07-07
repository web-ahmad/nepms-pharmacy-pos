import sys
import os
import sqlite3
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.hr import PayrollRun

def alter_table():
    db_path = "nepms_local.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add columns if they do not exist
    try:
        cursor.execute("ALTER TABLE payroll_runs ADD COLUMN remarks VARCHAR;")
        print("Added 'remarks' column.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Ignored error adding remarks: {e}")
            
    try:
        cursor.execute("ALTER TABLE payroll_runs ADD COLUMN approved_by VARCHAR;")
        print("Added 'approved_by' column.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Ignored error adding approved_by: {e}")
            
    conn.commit()
    conn.close()

def migrate_payroll_runs():
    db = SessionLocal()
    try:
        runs = db.query(PayrollRun).all()
        updated_count = 0
        for run in runs:
            needs_update = False
            
            # Map old statuses
            if run.status in ["Auto-Posted", "Paid"]:
                run.status = "Paid"
                needs_update = True
            elif run.status not in ["Draft", "Pending Approval", "Approved", "Paid"]:
                run.status = "Approved"
                needs_update = True
                
            # The instructions: "Set approved_by_user_id to null and approval_remarks to "Legacy Record" for these old entries."
            if run.remarks is None:
                run.remarks = "Legacy Record"
                run.approved_by = None
                needs_update = True

            # Also fix created_by if null to prevent pydantic errors
            if run.created_by is None:
                run.created_by = "system" # fallback
                needs_update = True

            if needs_update:
                updated_count += 1
                
        db.commit()
        print(f"Successfully migrated {updated_count} legacy payroll records.")
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    alter_table()
    migrate_payroll_runs()
