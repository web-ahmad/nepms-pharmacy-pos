import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE employees ADD COLUMN user_id VARCHAR(36);"))
        conn.commit()
    print("Column user_id added successfully")
except Exception as e:
    print("Error:", e)
