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

# Defaults to the local SQLite file so a machine with no .env still boots;
# point DATABASE_URL at Supabase to run against Postgres.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nepms_local.db")


def _normalise_pg_url(url: str) -> str:
    """Make a Supabase-style URL safe for SQLAlchemy + psycopg2.

    Supabase's dashboard shows `postgresql://...` (and older docs `postgres://`),
    but the bare `postgres://` alias was dropped by SQLAlchemy, so pin the
    driver explicitly. Supabase also refuses plaintext connections, so force
    sslmode=require unless the caller already chose a mode.
    """
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]

    if url.startswith("postgresql") and "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
if not IS_SQLITE:
    SQLALCHEMY_DATABASE_URL = _normalise_pg_url(SQLALCHEMY_DATABASE_URL)

# Supabase's transaction pooler (port 6543) multiplexes many clients onto few
# backends and drops idle connections aggressively, so it wants a small pool
# and a short recycle. The session pooler / direct connection (5432) is a real
# dedicated backend and takes a normal pool.
IS_TRANSACTION_POOLER = (not IS_SQLITE) and ":6543" in SQLALCHEMY_DATABASE_URL
# Supabase caps the *session* pooler at 15 clients for the whole project
# ("max clients reached in session mode - pool_size: 15"). That ceiling covers
# the app, any maintenance script, and any other tool at once, so the app must
# stay well under it or a second connection anywhere fails outright.
IS_SUPABASE_POOLER = (not IS_SQLITE) and "pooler.supabase.com" in SQLALCHEMY_DATABASE_URL

if IS_SQLITE:
    # SQLite objects to a connection being used across threads.
    connect_args = {"check_same_thread": False}
    engine_kwargs = {}
else:
    connect_args = {
        # Fail fast instead of tying up a request thread on a dead network.
        "connect_timeout": 10,
        "application_name": "pharvix-backend",
    }
    if IS_TRANSACTION_POOLER:
        # Transaction mode holds a real backend only for the length of a
        # transaction and allows far more client connections than session mode,
        # so the pool can actually cover this app's load. It has to: besides
        # HTTP requests, main.py runs three permanent asyncio loops (audit poll
        # every 2s, inventory scan, billing enforcement) plus APScheduler jobs,
        # all competing for the same pool. On the 15-client session pooler that
        # exhausted the pool and the dashboard's concurrent calls 500'd with
        # "QueuePool limit of size 6 overflow 4 reached".
        # Short recycle because the pooler drops idle connections.
        pool_size, max_overflow, recycle = 20, 10, 300
    elif IS_SUPABASE_POOLER:
        # Session mode is capped at 15 clients for the WHOLE project — app,
        # scripts and psql together. 6 + 4 leaves headroom, but it is tight;
        # prefer the transaction pooler (port 6543) for the app itself.
        pool_size, max_overflow, recycle = 6, 4, 1800
    else:
        pool_size, max_overflow, recycle = 20, 20, 1800

    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": pool_size,
        "max_overflow": max_overflow,
        "pool_timeout": 30,
        "pool_recycle": recycle,
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
