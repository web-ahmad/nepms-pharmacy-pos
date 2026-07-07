import sqlite3

def alter():
    conn = sqlite3.connect("backend/nepms_local.db")
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(employees)")
    columns = [col[1] for col in cursor.fetchall()]
    print("Existing columns:", columns)
    
    # Add missing ones
    if "salary_type" not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN salary_type VARCHAR DEFAULT 'Monthly'")
        print("Added salary_type")
        
    if "account_no" not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN account_no VARCHAR")
        print("Added account_no")
        
    if "weekend_days" not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN weekend_days JSON")
        print("Added weekend_days")
        
    if "overtime_allowed" not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN overtime_allowed BOOLEAN DEFAULT 0")
        print("Added overtime_allowed")
        
    if "standard_break_time" not in columns:
        cursor.execute("ALTER TABLE employees ADD COLUMN standard_break_time INTEGER DEFAULT 60")
        print("Added standard_break_time")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    alter()
