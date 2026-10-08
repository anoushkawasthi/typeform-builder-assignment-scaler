"""
routers/questions.py — creator-side routes for the questions of a form.

What it does:   add, edit, reorder and delete questions, including the choices of
                multiple-choice and dropdown questions.
Depends on:     auth.py, database.py, models.py, schemas.py, presenters.py,
                services/snapshot.py, routers/forms.py (get_form_or_404).
Depended on by: main.py (registers the router).

Every route returns the whole form (FormDetailOut). The builder keeps one copy of the
form in memory and simply replaces it with whatever the server sends back, so the screen
can never disagree with the database.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import presenters, schemas
from app.auth import get_current_creator
from app.database import get_db
from app.models import Creator, Form, Question, QuestionChoice, utc_now
from app.routers.forms import get_form_or_404
from app.services import snapshot

router = APIRouter(prefix="/api", tags=["questions"])


def get_question_or_404(db: Session, question_id: int, creator: Creator) -> Question:
    """Load a question only if its form belongs to this creator and it is not deleted."""
    question = db.scalar(
        select(Question)
        .join(Form, Question.form_id == Form.id)
        .where(Question.id == question_id, Form.creator_id == creator.id, Question.deleted_at.is_(None))
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


def renumber_positions(questions: list[Question]) -> None:
    """Give the questions positions 0, 1, 2, ... in the order of the list."""
    for position, question in enumerate(questions):
        question.position = position


def sync_choices(db: Session, form: Form, question: Question, incoming: list[schemas.ChoiceIn]) -> None:
    """
    Make the question's choices match the list the builder sent.

    The builder always sends the complete ordered list, so three things can happen:
      - a choice with a known id  -> update its label and position
      - a choice without an id    -> it is new, create it
      - an existing choice that is missing from the list -> the creator removed it
    A removed choice that respondents can still pick (it is in the published snapshot)
    is only soft-deleted, for the same reason as questions; see services/snapshot.py.
    """
    existing_by_id: dict[int, QuestionChoice] = {}
    for choice in question.choices:
        if choice.deleted_at is None:
            existing_by_id[choice.id] = choice

    kept_ids: list[int] = []
    for position, incoming_choice in enumerate(incoming):
        if incoming_choice.id is not None and incoming_choice.id in existing_by_id:
            choice = existing_by_id[incoming_choice.id]
            choice.label = incoming_choice.label
            choice.position = position
            kept_ids.append(choice.id)
        else:
            question.choices.append(QuestionChoice(label=incoming_choice.label, position=position))

    for choice_id, choice in existing_by_id.items():
        if choice_id in kept_ids:
            continue
        if snapshot.is_choice_in_snapshot(form, choice_id):
            choice.deleted_at = utc_now()
        else:
            db.delete(choice)


@router.post(
    "/forms/{form_id}/questions",
    response_model=schemas.FormDetailOut,
    status_code=status.HTTP_201_CREATED,
)
def create_question(
    form_id: int,
    body: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """Add a question at `position` (or at the end) and shift the ones after it."""
    form = get_form_or_404(db, form_id, creator)

    ordered = snapshot.active_questions(form)
    insert_at = len(ordered)
    if body.position is not None and body.position < len(ordered):
        insert_at = body.position

    question = Question(form_id=form.id, type=body.type)
    # Choice questions start with one empty choice, as Typeform does, so the creator
    # sees where to type.
    if body.type in ("multiple_choice", "dropdown"):
        question.choices.append(QuestionChoice(label="", position=0))

    db.add(question)
    ordered.insert(insert_at, question)
    renumber_positions(ordered)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.patch("/questions/{question_id}", response_model=schemas.FormDetailOut)
def update_question(
    question_id: int,
    body: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    question = get_question_or_404(db, question_id, creator)
    form = question.form
    changes = body.model_dump(exclude_unset=True)

    new_type = changes.get("type")
    if new_type is not None and new_type != question.type:
        # Why blocked: stored answers are typed (text, number, choices...). Changing a
        # rating into an email question would leave answers that no longer make sense.
        if len(question.answers) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This question already has answers, so its type can't be changed. "
                "Delete it and add a new question instead.",
            )
        question.type = new_type
        becomes_choice_type = new_type in ("multiple_choice", "dropdown")
        if becomes_choice_type and len(snapshot.active_choices(question)) == 0:
            question.choices.append(QuestionChoice(label="", position=0))

    for field_name in ("title", "description", "is_required", "allow_multiple", "rating_max"):
        new_value = changes.get(field_name)
        if new_value is not None:
            setattr(question, field_name, new_value)

    if body.choices is not None:
        sync_choices(db, form, question, body.choices)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.delete("/questions/{question_id}", response_model=schemas.FormDetailOut)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """
    Remove a question from the draft.

    If respondents can still see it (it is in the published snapshot) it is only marked
    deleted, and its answers survive until the next publish. Otherwise nothing can
    reference it and it is deleted straight away.
    """
    question = get_question_or_404(db, question_id, creator)
    form = question.form

    if snapshot.is_question_in_snapshot(form, question.id):
        question.deleted_at = utc_now()
    else:
        db.delete(question)
        db.flush()
        db.refresh(form)

    renumber_positions(snapshot.active_questions(form))
    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.put("/forms/{form_id}/questions/order", response_model=schemas.FormDetailOut)
def reorder_questions(
    form_id: int,
    body: schemas.QuestionOrderIn,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """
    Save a new order after a drag-and-drop.

    The request must list every question of the form exactly once. Checking that here
    means a stale browser tab cannot silently drop or duplicate a question.
    """
    form = get_form_or_404(db, form_id, creator)
    current = snapshot.active_questions(form)

    current_ids = sorted(question.id for question in current)
    if sorted(body.question_ids) != current_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="question_ids must contain every question of this form exactly once",
        )

    question_by_id = {question.id: question for question in current}
    reordered = [question_by_id[question_id] for question_id in body.question_ids]
    renumber_positions(reordered)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)
