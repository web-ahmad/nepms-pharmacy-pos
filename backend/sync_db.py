import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and "6543" in db_url:
    # Use direct connection instead of pooler for DDL operations to prevent timeouts
    db_url = db_url.replace(":6543", ":5432")
    os.environ["DATABASE_URL"] = db_url

import database
from models.base import BaseModel
import models

print(f"Connecting to: {db_url.split('@')[1]}")
print("Creating tables in Supabase based on SQLAlchemy models...")
BaseModel.metadata.create_all(bind=database.engine)
print("All tables created successfully!")
