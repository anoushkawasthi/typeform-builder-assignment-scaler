"""
snapshot.py — publishing a form.

What it does:   builds the frozen copy of a form that respondents see, and runs the
                publish / unpublish steps.
Depends on:     models.py, services/text.py.
Depended on by: routers/forms.py (publish, unpublish, delete rules),
                routers/questions.py (delete rules), routers/public.py,
                routers/responses.py and services/export.py (read the snapshot).

Why a snapshot exists at all:
    Like Typeform, edits in the builder are a draft. They must not reach people who are
    filling the form until the creator presses Publish. So Publish copies the draft into
    `forms.published_snapshot` (JSON), and the public link reads only that copy.

Why soft delete goes with it:
    If a question that is in the snapshot is deleted from the draft, respondents can
    still see and answer it, and their answers need a `questions` row to point at. So
    such a question is only marked deleted (`deleted_at`) and is really removed, together
    with its answers, when the next publish replaces the snapshot.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    CHOICE_QUESTION_TYPES,
    FORM_STATUS_DRAFT,
    FORM_STATUS_PUBLISHED,
    Answer,
    AnswerChoice,
    Form,
    Question,
    QuestionChoice,
    utc_now,
)
from app.services.text import strip_formatting


def active_questions(form: Form) -> list[Question]:
    """The draft's questions in order, without soft-deleted ones."""
    return [question for question in form.questions if question.deleted_at is None]


def active_choices(question: Question) -> list[QuestionChoice]:
    """
    The choices to show for a question. Non-choice types return an empty list even if
    old choice rows exist, which lets a creator switch type and back without losing them.
    """
    if question.type not in CHOICE_QUESTION_TYPES:
        return []
    return [choice for choice in question.choices if choice.deleted_at is None]


def active_logic_jumps(question: Question) -> list[dict]:
    """
    A question's rules as plain dictionaries, leaving out any rule that points at
    something the creator has deleted from the draft (a soft-deleted target question or
    choice). Such a rule could never apply, so it is hidden rather than shown broken.
    """
    rules = []
    for jump in question.logic_jumps:
        if jump.target_question is not None and jump.target_question.deleted_at is not None:
            continue
        if jump.compare_choice is not None and jump.compare_choice.deleted_at is not None:
            continue
        rules.append(
            {
                "id": jump.id,
                "operator": jump.operator,
                "compare_choice_id": jump.compare_choice_id,
                "compare_number": jump.compare_number,
                "compare_boolean": jump.compare_boolean,
                "target_question_id": jump.target_question_id,
            }
        )
    return rules


def build_snapshot(form: Form) -> dict:
    """Copy everything a respondent needs out of the draft into a plain dictionary."""
    question_dicts = []
    for question in active_questions(form):
        choice_dicts = []
        for choice in active_choices(question):
            choice_dicts.append({"id": choice.id, "label": choice.label})
        question_dicts.append(
            {
                "id": question.id,
                "type": question.type,
                "title": question.title,
                "description": question.description,
                "is_required": question.is_required,
                "allow_multiple": question.allow_multiple,
                "rating_max": question.rating_max,
                "choices": choice_dicts,
                "logic_jumps": active_logic_jumps(question),
            }
        )

    welcome = None
    if form.welcome_enabled:
        welcome = {
            "title": form.welcome_title,
            "text": form.welcome_text,
            "button_text": form.welcome_button_text,
        }

    return {
        "title": form.title,
        "theme": {
            "background_color": form.theme_background_color,
            "question_color": form.theme_question_color,
            "answer_color": form.theme_answer_color,
            "button_color": form.theme_button_color,
            "button_text_color": form.theme_button_text_color,
            "font": form.theme_font,
        },
        "welcome": welcome,
        "thank_you_title": form.thank_you_title,
        "thank_you_text": form.thank_you_text,
        "questions": question_dicts,
    }


def snapshot_questions(form: Form) -> list[dict]:
    """The questions of the published copy, or an empty list if never published."""
    if form.published_snapshot is None:
        return []
    return form.published_snapshot["questions"]


def snapshot_thank_you_title(form: Form) -> str:
    """The published ending's title, or an empty string if never published."""
    if form.published_snapshot is None:
        return ""
    return form.published_snapshot["thank_you_title"]


def is_question_in_snapshot(form: Form, question_id: int) -> bool:
    for question in snapshot_questions(form):
        if question["id"] == question_id:
            return True
    return False


def is_choice_in_snapshot(form: Form, choice_id: int) -> bool:
    for question in snapshot_questions(form):
        for choice in question["choices"]:
            if choice["id"] == choice_id:
                return True
    return False


def has_unpublished_changes(form: Form) -> bool:
    """True when the draft was edited after the last publish."""
    if form.status != FORM_STATUS_PUBLISHED or form.published_at is None:
        return False
    return form.updated_at > form.published_at


def list_removed_with_answers(db: Session, form: Form) -> list[dict]:
    """
    The questions and choices deleted from the draft that people had already answered,
    each with the number of stored answers the next publish will permanently remove.

    Why it is needed: the builder shows this list in the publish confirmation, so data
    is never destroyed without the creator being told exactly what and why. The deletion
    may have happened many edits ago, so a bare number would look unrelated to the edit
    being published.
    """
    removed = []

    # The inner joins leave out anything nobody answered: deleting that loses nothing.
    deleted_questions = db.execute(
        select(Question.title, func.count(Answer.id))
        .join(Answer, Answer.question_id == Question.id)
        .where(Question.form_id == form.id, Question.deleted_at.is_not(None))
        .group_by(Question.id)
        .order_by(Question.id)
    ).all()
    for question_title, answer_count in deleted_questions:
        removed.append(
            {
                "kind": "question",
                "label": strip_formatting(question_title),
                "question_title": strip_formatting(question_title),
                "answer_count": answer_count,
            }
        )

    # A deleted choice of a question that itself still exists. (If the whole question
    # was deleted, it is already in the list above.)
    deleted_choices = db.execute(
        select(QuestionChoice.label, Question.title, func.count())
        .select_from(AnswerChoice)
        .join(QuestionChoice, AnswerChoice.choice_id == QuestionChoice.id)
        .join(Question, QuestionChoice.question_id == Question.id)
        .where(
            Question.form_id == form.id,
            Question.deleted_at.is_(None),
            QuestionChoice.deleted_at.is_not(None),
        )
        .group_by(QuestionChoice.id)
        .order_by(QuestionChoice.id)
    ).all()
    for choice_label, question_title, answer_count in deleted_choices:
        removed.append(
            {
                "kind": "choice",
                "label": strip_formatting(choice_label),
                "question_title": strip_formatting(question_title),
                "answer_count": answer_count,
            }
        )

    return removed


def touch_form(form: Form) -> None:
    """Record that the draft changed. Called by every edit to a form or its questions."""
    form.updated_at = utc_now()


def publish_form(db: Session, form: Form) -> None:
    """
    Make the current draft the live form.

    Order matters: first really delete what was soft-deleted (the old snapshot is about
    to be replaced, so nothing can reference those rows any more), then take the new
    snapshot from what is left.
    """
    for question in list(form.questions):
        if question.deleted_at is not None:
            # Cascades to the question's choices and answers.
            db.delete(question)
            continue
        for choice in list(question.choices):
            if choice.deleted_at is not None:
                db.delete(choice)

    # Push the deletes to the database and reload, so build_snapshot sees only survivors.
    db.flush()
    db.refresh(form)

    now = utc_now()
    form.published_snapshot = build_snapshot(form)
    form.status = FORM_STATUS_PUBLISHED
    form.published_at = now
    # Same instant as published_at, so has_unpublished_changes() starts out False.
    form.updated_at = now


def unpublish_form(form: Form) -> None:
    """
    Close the public link. The snapshot is kept because the results pages use it to
    know which questions the stored answers belong to.
    """
    form.status = FORM_STATUS_DRAFT
