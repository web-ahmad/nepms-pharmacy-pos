from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase_client: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Removed circular model imports

# We will use SQLite for offline mode/local dev by default if Supabase URI is not provided.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nepms_local.db")

# For SQLite, we need connect_args={"check_same_thread": False}.
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine_kwargs = {}
if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args, **engine_kwargs
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import MetaData

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=naming_convention)
Base = declarative_base(metadata=metadata)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
