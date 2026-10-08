"""
auth.py — who is making this request.

What it does:   provides `get_current_creator`, the dependency every creator-side route
                uses to learn which creator it is acting for.
Depends on:     database.py, models.py.
Depended on by: routers/forms.py, routers/questions.py, routers/responses.py.

The brief allows simplified authentication ("assume a default logged-in creator"), so
this returns the one seeded creator. It is still a real dependency so that every query is
scoped by creator, and adding real login later means changing only this file.
"""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Creator

DEFAULT_CREATOR_NAME = "Demo Creator"
DEFAULT_CREATOR_EMAIL = "creator@example.com"


def get_or_create_default_creator(db: Session) -> Creator:
    """Return the default creator, creating it the first time it is needed."""
    creator = db.scalar(select(Creator).where(Creator.email == DEFAULT_CREATOR_EMAIL))
    if creator is None:
        creator = Creator(name=DEFAULT_CREATOR_NAME, email=DEFAULT_CREATOR_EMAIL)
        db.add(creator)
        db.commit()
    return creator


def get_current_creator(db: Session = Depends(get_db)) -> Creator:
    """With real login this would read a session cookie; here it is always the default."""
    return get_or_create_default_creator(db)
