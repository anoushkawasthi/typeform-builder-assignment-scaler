"""
routers/responses.py — creator-side routes for reading results.

What it does:   the responses table for a form, one response in full, and the
                per-question summary.
Depends on:     auth.py, database.py, models.py, schemas.py, presenters.py,
                services/snapshot.py, services/stats.py, routers/forms.py.
Depended on by: main.py (registers the router).

Results are described using the PUBLISHED questions (the snapshot), because those are
the questions respondents actually answered.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import presenters, schemas
from app.auth import get_current_creator
from app.database import get_db
from app.models import Answer, Creator, Form, Response
from app.routers.forms import get_form_or_404
from app.services import snapshot, stats

router = APIRouter(prefix="/api", tags=["responses"])


@router.get("/forms/{form_id}/responses", response_model=schemas.ResponsesTableOut)
def list_responses(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """
    Submitted responses, newest first, with their answers.

    Why `selectinload`: it fetches all answers (and their selected choices) for the whole
    page of responses in two extra queries, instead of two queries per response.
    """
    form = get_form_or_404(db, form_id, creator)

    responses = db.scalars(
        select(Response)
        .where(Response.form_id == form.id, Response.submitted_at.is_not(None))
        .options(selectinload(Response.answers).selectinload(Answer.selected_choices))
        .order_by(Response.submitted_at.desc())
    ).all()

    return schemas.ResponsesTableOut(
        questions=snapshot.snapshot_questions(form),
        responses=[presenters.present_response(response, form) for response in responses],
    )


@router.get("/forms/{form_id}/summary", response_model=schemas.FormSummaryOut)
def get_summary(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    form = get_form_or_404(db, form_id, creator)
    return stats.summarize_form(db, form)


@router.get("/responses/{response_id}", response_model=schemas.ResponseDetailOut)
def get_response(response_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """One submitted response in full. Scoped to the creator through the form."""
    response = db.scalar(
        select(Response)
        .join(Form, Response.form_id == Form.id)
        .where(
            Response.id == response_id,
            Form.creator_id == creator.id,
            Response.submitted_at.is_not(None),
        )
    )
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Response not found")

    form = response.form
    return schemas.ResponseDetailOut(
        form_id=form.id,
        form_title=form.title,
        questions=snapshot.snapshot_questions(form),
        response=presenters.present_response(response, form),
    )
