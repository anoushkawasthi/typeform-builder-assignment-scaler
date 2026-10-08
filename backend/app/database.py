"""
database.py — the connection to SQLite.

What it does:   creates the SQLAlchemy engine, the session factory, and the `get_db`
                dependency that hands one database session to each API request.
Depends on:     nothing inside this app (only SQLAlchemy and an environment variable).
Depended on by: models.py (uses `Base`), every router (uses `get_db`), main.py and
                seed.py (use `engine` / `SessionLocal`).
"""

import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Where the database file lives. Overridable so the deployed container can point it at a
# mounted volume, and tests can point it at an in-memory database.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")


def make_engine(database_url: str):
    """
    Build an engine for the given URL.

    Why `check_same_thread=False`: FastAPI runs request handlers in a thread pool, and
    SQLite by default refuses to let a connection be used from a thread other than the
    one that opened it. Each request still gets its own session, so this is safe.
    """
    new_engine = create_engine(database_url, connect_args={"check_same_thread": False})

    # Why this listener: SQLite ignores foreign keys unless told otherwise on every new
    # connection. Without it, deleting a form would leave its questions behind.
    @event.listens_for(new_engine, "connect")
    def enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return new_engine


def ensure_database_folder_exists(database_url: str) -> None:
    """SQLite creates the file but not its parent folder, so make the folder first."""
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return
    file_path = database_url[len(prefix):]
    folder = os.path.dirname(file_path)
    if folder:
        os.makedirs(folder, exist_ok=True)


ensure_database_folder_exists(DATABASE_URL)
engine = make_engine(DATABASE_URL)

# autoflush stays on (the default) so a query inside a request sees rows added earlier in
# the same request. Nothing is saved to disk until we call commit().
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Parent class of every table model in models.py."""


def get_db():
    """
    FastAPI dependency: one session per request, always closed afterwards.

    Why a generator: the code after `yield` runs when the request finishes, even if the
    handler raised an error, so connections are never leaked.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
