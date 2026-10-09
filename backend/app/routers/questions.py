"""
routers/questions.py — creator-side routes for the questions of a form.

What it does:   add, edit, reorder and delete questions, and add, rename and remove
                the choices of multiple-choice and dropdown questions.
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
        # Rules are written for a particular type ("is choice B", "greater than 3").
        # They would be meaningless on the new type, so they are removed.
        question.logic_jumps.clear()
        becomes_choice_type = new_type in ("multiple_choice", "dropdown")
        if becomes_choice_type and len(snapshot.active_choices(question)) == 0:
            question.choices.append(QuestionChoice(label="", position=0))

    simple_fields = (
        "title",
        "description",
        "is_required",
        "allow_multiple",
        "rating_max",
        "rating_shape",
        "randomize_choices",
        "choices_vertical",
        "placeholder",
    )
    for field_name in simple_fields:
        new_value = changes.get(field_name)
        if new_value is not None:
            setattr(question, field_name, new_value)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.post(
    "/questions/{question_id}/duplicate",
    response_model=schemas.FormDetailOut,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_question(
    question_id: int,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """
    Insert a copy of a question directly after it, with its settings and choices.
    Logic jumps are not copied: a rule on the copy pointing where the original points
    would rarely be what the creator wants.
    """
    original = get_question_or_404(db, question_id, creator)
    form = original.form

    copy = Question(
        form_id=form.id,
        type=original.type,
        title=original.title,
        description=original.description,
        is_required=original.is_required,
        allow_multiple=original.allow_multiple,
        rating_max=original.rating_max,
        rating_shape=original.rating_shape,
        randomize_choices=original.randomize_choices,
        choices_vertical=original.choices_vertical,
        placeholder=original.placeholder,
    )
    for position, choice in enumerate(snapshot.active_choices(original)):
        copy.choices.append(QuestionChoice(label=choice.label, position=position))

    ordered = snapshot.active_questions(form)
    db.add(copy)
    ordered.insert(ordered.index(original) + 1, copy)
    renumber_positions(ordered)

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


# ----------------------------------------------------------------------------------------
# Choices
#
# Each choice is edited on its own (add one, rename one, remove one) rather than by
# sending the whole list. That way two edits made close together cannot overwrite each
# other: renaming choice A never carries a stale copy of choice B's label.
# ----------------------------------------------------------------------------------------


def get_choice_or_404(db: Session, choice_id: int, creator: Creator) -> QuestionChoice:
    """Load a choice only if its form belongs to this creator and it is not deleted."""
    choice = db.scalar(
        select(QuestionChoice)
        .join(Question, QuestionChoice.question_id == Question.id)
        .join(Form, Question.form_id == Form.id)
        .where(
            QuestionChoice.id == choice_id,
            Form.creator_id == creator.id,
            QuestionChoice.deleted_at.is_(None),
            Question.deleted_at.is_(None),
        )
    )
    if choice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Choice not found")
    return choice


@router.post(
    "/questions/{question_id}/choices",
    response_model=schemas.FormDetailOut,
    status_code=status.HTTP_201_CREATED,
)
def create_choice(
    question_id: int,
    body: schemas.ChoiceCreate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """Add a choice to the end of a question's list."""
    question = get_question_or_404(db, question_id, creator)
    form = question.form

    # One past the highest position in use. Soft-deleted choices are counted too, so a
    # new choice never shares a position with one that is waiting to be purged.
    next_position = 0
    for existing in question.choices:
        if existing.position >= next_position:
            next_position = existing.position + 1

    question.choices.append(QuestionChoice(label=body.label, position=next_position))
    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.put("/questions/{question_id}/choices/order", response_model=schemas.FormDetailOut)
def reorder_choices(
    question_id: int,
    body: schemas.ChoiceOrderIn,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """
    Save a new order of a question's choices after a drag-and-drop. Like reordering
    questions, the request must list every choice exactly once.
    """
    question = get_question_or_404(db, question_id, creator)
    form = question.form
    current = snapshot.active_choices(question)

    if sorted(body.choice_ids) != sorted(choice.id for choice in current):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="choice_ids must contain every choice of this question exactly once",
        )

    choice_by_id = {choice.id: choice for choice in current}
    for position, choice_id in enumerate(body.choice_ids):
        choice_by_id[choice_id].position = position

    snapshot.touch_form(form)
    db.commit()
    # Reload so the choices come back in their new order.
    db.refresh(question)
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.patch("/choices/{choice_id}", response_model=schemas.FormDetailOut)
def update_choice(
    choice_id: int,
    body: schemas.ChoiceUpdate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """Rename a choice."""
    choice = get_choice_or_404(db, choice_id, creator)
    form = choice.question.form

    choice.label = body.label
    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.delete("/choices/{choice_id}", response_model=schemas.FormDetailOut)
def delete_choice(
    choice_id: int,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """
    Remove a choice from the draft. Same rule as deleting a question: if respondents can
    still pick it (it is in the published snapshot) it is only marked deleted until the
    next publish; otherwise it is deleted straight away.
    """
    choice = get_choice_or_404(db, choice_id, creator)
    form = choice.question.form

    if snapshot.is_choice_in_snapshot(form, choice.id):
        choice.deleted_at = utc_now()
    else:
        db.delete(choice)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)
