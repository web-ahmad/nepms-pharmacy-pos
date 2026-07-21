import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and "6543" in db_url:
    # Use direct connection instead of pooler for DDL operations to prevent timeouts
    db_url = db_url.replace(":6543", ":5432")
    os.environ["DATABASE_URL"] = db_url

import database
from sqlalchemy import text, inspect

print(f"Connecting to: {db_url.split('@')[1]}")
with database.engine.connect() as conn:
    inspector = inspect(database.engine)
    tables = inspector.get_table_names()
    print("Tables before:", tables)
    for table in tables:
        try:
            conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
            print(f"Dropped {table}")
        except Exception as e:
            print(f"Error dropping {table}: {e}")
            
    # Clean up ENUM types that may have failed creation
    try:
        conn.execute(text("DROP TYPE IF EXISTS accountcategory CASCADE;"))
        conn.execute(text("DROP TYPE IF EXISTS packagingsize CASCADE;"))
        # Add others if needed
    except Exception:
        pass
        
    conn.commit()
    print("All tables dropped.")
