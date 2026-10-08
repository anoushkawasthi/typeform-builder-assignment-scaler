"""
main.py — the FastAPI application. Start here when reading the backend.

What it does:   creates the app, allows the frontend's origin to call it (CORS), creates
                the tables and sample data on first start, and plugs in the routers.
Depends on:     database.py, models.py, seed.py, and the four routers.
Depended on by: uvicorn (`uvicorn app.main:app`) and the tests.

Request path:   browser -> router function -> (services for rules, presenters for output)
                -> SQLAlchemy models -> SQLite file.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (importing registers the tables on Base)
from app.database import Base, SessionLocal, engine
from app.routers import forms, public, questions, responses
from app.seed import seed_if_empty

# Comma-separated list of sites allowed to call this API from a browser.
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Runs once when the server starts.

    Creating tables here (instead of with a migration tool) is enough for a project with
    a single schema version. Seeding only when the database is empty makes a fresh
    deployment immediately usable without ever overwriting real data.
    """
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="Typeform Replica API", lifespan=lifespan)

# Browsers block a page on one origin from calling an API on another unless the API
# says the origin is allowed. The frontend and API live on different subdomains.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms.router)
app.include_router(questions.router)
app.include_router(responses.router)
app.include_router(public.router)


@app.get("/api/health")
def health():
    """Used by the deployment to check that the server is up."""
    return {"status": "ok"}
