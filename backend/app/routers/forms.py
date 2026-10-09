"""
routers/forms.py — creator-side routes for forms.

What it does:   list, create, read, update (rename / theme / thank-you text), delete,
                duplicate, publish and unpublish forms.
Depends on:     auth.py, database.py, models.py, schemas.py, presenters.py,
                services/snapshot.py.
Depended on by: main.py (registers the router). Also exports `get_form_or_404`, which
                routers/questions.py and routers/responses.py reuse.
"""

import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import presenters, schemas
from app.auth import get_current_creator
from app.database import get_db
from app.models import Creator, Form, LogicJump, Question, QuestionChoice
from app.services import snapshot

router = APIRouter(prefix="/api/forms", tags=["forms"])

PUBLIC_ID_LENGTH = 8
PUBLIC_ID_ALPHABET = string.ascii_letters + string.digits


def generate_public_id(db: Session) -> str:
    """
    A random id for the public link, e.g. "aB3xK9pQ".

    Why `secrets` and not `random`: the link is the only thing protecting a form from
    being found, so it should not be predictable. The loop guards against the (very
    unlikely) case of generating an id that is already taken.
    """
    while True:
        public_id = "".join(secrets.choice(PUBLIC_ID_ALPHABET) for _ in range(PUBLIC_ID_LENGTH))
        existing = db.scalar(select(Form).where(Form.public_id == public_id))
        if existing is None:
            return public_id


def get_form_or_404(db: Session, form_id: int, creator: Creator) -> Form:
    """
    Load a form, but only if it belongs to this creator.

    Why 404 and not 403 for someone else's form: it avoids confirming that a form with
    that id exists.
    """
    form = db.scalar(select(Form).where(Form.id == form_id, Form.creator_id == creator.id))
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    return form


@router.get("", response_model=list[schemas.FormListItemOut])
def list_forms(db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """All of the creator's forms, most recently edited first."""
    forms = db.scalars(select(Form).where(Form.creator_id == creator.id).order_by(Form.updated_at.desc())).all()
    return [presenters.present_form_list_item(db, form) for form in forms]


@router.post("", response_model=schemas.FormDetailOut, status_code=status.HTTP_201_CREATED)
def create_form(
    body: schemas.FormCreate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    form = Form(creator_id=creator.id, public_id=generate_public_id(db), title=body.title)
    db.add(form)
    db.commit()
    return presenters.present_form_detail(db, form)


@router.get("/{form_id}", response_model=schemas.FormDetailOut)
def get_form(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    form = get_form_or_404(db, form_id, creator)
    return presenters.present_form_detail(db, form)


@router.patch("/{form_id}", response_model=schemas.FormDetailOut)
def update_form(
    form_id: int,
    body: schemas.FormUpdate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """
    Partial update. `exclude_unset=True` gives only the fields the request actually
    sent, so a rename does not reset the theme to its defaults.
    """
    form = get_form_or_404(db, form_id, creator)

    changes = body.model_dump(exclude_unset=True)
    for field_name, new_value in changes.items():
        if new_value is not None:
            setattr(form, field_name, new_value)

    snapshot.touch_form(form)
    db.commit()
    return presenters.present_form_detail(db, form)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """Deletes the form and, through cascades, its questions, responses and answers."""
    form = get_form_or_404(db, form_id, creator)
    db.delete(form)
    db.commit()


@router.post("/{form_id}/duplicate", response_model=schemas.FormDetailOut, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """
    Copy a form's draft into a new draft form. Responses are not copied, and the copy
    starts unpublished with its own public link.
    """
    original = get_form_or_404(db, form_id, creator)

    copy = Form(
        creator_id=creator.id,
        public_id=generate_public_id(db),
        title=f"{original.title} (copy)",
        theme_background_color=original.theme_background_color,
        theme_question_color=original.theme_question_color,
        theme_answer_color=original.theme_answer_color,
        theme_button_color=original.theme_button_color,
        theme_button_text_color=original.theme_button_text_color,
        theme_font=original.theme_font,
        welcome_enabled=original.welcome_enabled,
        welcome_title=original.welcome_title,
        welcome_text=original.welcome_text,
        welcome_button_text=original.welcome_button_text,
        thank_you_title=original.thank_you_title,
        thank_you_text=original.thank_you_text,
    )

    # Copies get new ids, so while copying we remember which new row came from which
    # old one. Logic jumps refer to questions and choices by id and need translating.
    question_copy_by_old_id: dict[int, Question] = {}
    choice_copy_by_old_id: dict[int, QuestionChoice] = {}

    for position, question in enumerate(snapshot.active_questions(original)):
        question_copy = Question(
            type=question.type,
            title=question.title,
            description=question.description,
            is_required=question.is_required,
            position=position,
            allow_multiple=question.allow_multiple,
            rating_max=question.rating_max,
            rating_shape=question.rating_shape,
            randomize_choices=question.randomize_choices,
            choices_vertical=question.choices_vertical,
            placeholder=question.placeholder,
        )
        for choice_position, choice in enumerate(snapshot.active_choices(question)):
            choice_copy = QuestionChoice(label=choice.label, position=choice_position)
            question_copy.choices.append(choice_copy)
            choice_copy_by_old_id[choice.id] = choice_copy
        copy.questions.append(question_copy)
        question_copy_by_old_id[question.id] = question_copy

    db.add(copy)
    # flush() makes the database assign ids to the copies, which the rules below need.
    db.flush()

    for question in snapshot.active_questions(original):
        for position, rule in enumerate(snapshot.active_logic_jumps(question)):
            target_id = None
            if rule["target_question_id"] is not None:
                target_id = question_copy_by_old_id[rule["target_question_id"]].id
            compare_choice_id = None
            if rule["compare_choice_id"] is not None:
                compare_choice_id = choice_copy_by_old_id[rule["compare_choice_id"]].id
            question_copy_by_old_id[question.id].logic_jumps.append(
                LogicJump(
                    position=position,
                    operator=rule["operator"],
                    compare_choice_id=compare_choice_id,
                    compare_number=rule["compare_number"],
                    compare_boolean=rule["compare_boolean"],
                    target_question_id=target_id,
                )
            )

    db.commit()
    return presenters.present_form_detail(db, copy)


@router.post("/{form_id}/publish", response_model=schemas.FormDetailOut)
def publish_form(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """Make the current draft live. Also used to push later edits live ("republish")."""
    form = get_form_or_404(db, form_id, creator)

    if len(snapshot.active_questions(form)) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one question before publishing",
        )

    snapshot.publish_form(db, form)
    db.commit()
    return presenters.present_form_detail(db, form)


@router.post("/{form_id}/unpublish", response_model=schemas.FormDetailOut)
def unpublish_form(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    form = get_form_or_404(db, form_id, creator)
    snapshot.unpublish_form(form)
    db.commit()
    return presenters.present_form_detail(db, form)
