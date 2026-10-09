"""
database.py — the connection to SQLite.

What it does:   creates the SQLAlchemy engine, the session factory, and the `get_db`
                dependency that hands one database session to each API request.
Depends on:     nothing inside this app (only SQLAlchemy and an environment variable).
Depended on by: models.py (uses `Base`), every router (uses `get_db`), main.py and
                seed.py (use `engine` / `SessionLocal`).
"""

import os

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

# Where the database file lives. Overridable so the deployed container can point it at a
# mounted volume, and tests can point it at an in-memory database.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")


def make_engine(database_url: str, single_connection: bool = False):
    """
    Build an engine for the given URL.

    Why `check_same_thread=False`: FastAPI runs request handlers in a thread pool, and
    SQLite by default refuses to let a connection be used from a thread other than the
    one that opened it. Each request still gets its own session, so this is safe.

    `single_connection=True` is for tests: an in-memory SQLite database disappears when
    its connection closes, so the tests keep exactly one connection open and share it.
    """
    engine_options = {"connect_args": {"check_same_thread": False}}
    if single_connection:
        engine_options["poolclass"] = StaticPool
    new_engine = create_engine(database_url, **engine_options)

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


# Columns added to existing tables after the first release. `create_all` creates missing
# TABLES but never changes a table that already exists, so a database made by an older
# version of the code would lack these. Each entry is (table, column, SQL definition).
ADDED_COLUMNS = [
    ("forms", "welcome_enabled", "BOOLEAN NOT NULL DEFAULT 0"),
    ("forms", "welcome_title", "VARCHAR(255) NOT NULL DEFAULT ''"),
    ("forms", "welcome_text", "TEXT NOT NULL DEFAULT ''"),
    ("forms", "welcome_button_text", "VARCHAR(24) NOT NULL DEFAULT 'Start'"),
    ("questions", "rating_shape", "VARCHAR(20) NOT NULL DEFAULT 'star'"),
    ("questions", "randomize_choices", "BOOLEAN NOT NULL DEFAULT 0"),
    ("questions", "choices_vertical", "BOOLEAN NOT NULL DEFAULT 1"),
    ("questions", "placeholder", "VARCHAR(255) NOT NULL DEFAULT ''"),
]


def add_missing_columns(target_engine) -> None:
    """
    A very small migration step: add any column from ADDED_COLUMNS that the database
    does not have yet. Existing rows get the column's default, so no data is lost.

    Why not a migration tool such as Alembic: the only schema changes so far are a few
    added columns, and this is a dozen lines that can be read top to bottom.
    """
    inspector = inspect(target_engine)
    existing_tables = inspector.get_table_names()

    with target_engine.begin() as connection:
        for table_name, column_name, definition in ADDED_COLUMNS:
            if table_name not in existing_tables:
                # A brand-new database: create_all will make the table with every column.
                continue
            existing_columns = [column["name"] for column in inspector.get_columns(table_name)]
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


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
