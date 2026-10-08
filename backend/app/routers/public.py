"""
routers/public.py — the routes a respondent's browser calls. No login.

What it does:   serves a published form, records that someone started filling it, and
                accepts the final submission after validating it.
Depends on:     database.py, models.py, schemas.py, presenters.py,
                services/validation.py.
Depended on by: main.py (registers the router).

None of these routes use `get_current_creator`: anyone with the link may call them. They
only ever read the published snapshot, never the draft.
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import presenters, schemas
from app.database import get_db
from app.models import FORM_STATUS_PUBLISHED, Answer, AnswerChoice, Form, Response, utc_now
from app.services import validation

router = APIRouter(prefix="/api/public", tags=["public"])

FORM_CLOSED_MESSAGE = "This form is not accepting responses"


def get_published_form_or_404(db: Session, public_id: str) -> Form:
    """
    Find a form by its public id, but only while it is published.

    A draft or unpublished form answers exactly like a form that does not exist, so the
    link reveals nothing about forms that are not live.
    """
    form = db.scalar(select(Form).where(Form.public_id == public_id))
    if form is None or form.status != FORM_STATUS_PUBLISHED or form.published_snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=FORM_CLOSED_MESSAGE)
    return form


@router.get("/forms/{public_id}", response_model=schemas.PublicFormOut)
def get_public_form(public_id: str, db: Session = Depends(get_db)):
    form = get_published_form_or_404(db, public_id)
    return presenters.present_public_form(form)


@router.post(
    "/forms/{public_id}/responses",
    response_model=schemas.ResponseStartOut,
    status_code=status.HTTP_201_CREATED,
)
def start_response(public_id: str, db: Session = Depends(get_db)):
    """
    Record that someone began filling the form, and give their browser a token.

    Why a separate step from submitting: a response that was started but never
    submitted is how we measure completion rate. The token is random and unguessable, so
    holding it is the only "permission" needed to submit that one response.
    """
    form = get_published_form_or_404(db, public_id)
    response = Response(form_id=form.id, token=secrets.token_urlsafe(24))
    db.add(response)
    db.commit()
    return schemas.ResponseStartOut(token=response.token)


@router.post("/responses/{token}/submit", status_code=status.HTTP_201_CREATED)
def submit_response(token: str, body: schemas.SubmitIn, db: Session = Depends(get_db)):
    """
    Validate and store a finished response.

    All answers are saved in one transaction: either the whole response is stored or
    none of it is. On validation failure nothing is written and the browser gets the
    list of problems, keyed by question, so it can jump to the first one.
    """
    response = db.scalar(select(Response).where(Response.token == token))
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Response not found")
    if response.submitted_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This response was already submitted")

    form = response.form
    if form.status != FORM_STATUS_PUBLISHED or form.published_snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=FORM_CLOSED_MESSAGE)

    questions = form.published_snapshot["questions"]
    clean_answers, errors = validation.validate_submission(questions, body.answers)

    if len(errors) > 0:
        error_list = [{"question_id": error.question_id, "message": error.message} for error in errors]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": "Some answers need attention", "errors": error_list},
        )

    for clean_answer in clean_answers:
        answer = Answer(
            response_id=response.id,
            question_id=clean_answer.question_id,
            value_text=clean_answer.text,
            value_number=clean_answer.number,
            value_boolean=clean_answer.boolean,
        )
        for choice_id in clean_answer.choice_ids:
            answer.selected_choices.append(AnswerChoice(choice_id=choice_id))
        db.add(answer)

    response.submitted_at = utc_now()
    db.commit()
    return {"status": "submitted"}
