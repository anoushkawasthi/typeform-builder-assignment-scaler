"""
presenters.py — turning database rows into API responses.

What it does:   one function per response shape, each taking SQLAlchemy objects and
                returning the matching Pydantic model from schemas.py.
Depends on:     models.py, schemas.py, services/snapshot.py.
Depended on by: every router.

Why it is separate from the routers: several routes return the same shape (creating,
editing and publishing a form all return the full form), so the conversion is written
once here and the routers stay short.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import schemas
from app.models import Answer, Form, Question, Response
from app.services import snapshot
from app.services.text import strip_formatting


def count_submitted_responses(db: Session, form_id: int) -> int:
    """Responses that were actually finished. Partial ones are not counted."""
    return db.scalar(
        select(func.count(Response.id)).where(Response.form_id == form_id, Response.submitted_at.is_not(None))
    )


def count_answers_per_question(db: Session, form_id: int) -> dict[int, int]:
    """
    {question_id: number of answers} for one form, in a single GROUP BY query.

    Why one query: asking the database once per question would mean one round trip for
    every question in the form (the "N+1 queries" problem).
    """
    rows = db.execute(
        select(Answer.question_id, func.count(Answer.id))
        .join(Question, Answer.question_id == Question.id)
        .where(Question.form_id == form_id)
        .group_by(Answer.question_id)
    ).all()

    counts: dict[int, int] = {}
    for question_id, answer_count in rows:
        counts[question_id] = answer_count
    return counts


def present_theme(form: Form) -> schemas.ThemeOut:
    return schemas.ThemeOut(
        background_color=form.theme_background_color,
        question_color=form.theme_question_color,
        answer_color=form.theme_answer_color,
        button_color=form.theme_button_color,
        button_text_color=form.theme_button_text_color,
        font=form.theme_font,
    )


def present_question(question: Question, answer_count: int) -> schemas.QuestionOut:
    choices = []
    for choice in snapshot.active_choices(question):
        choices.append(schemas.ChoiceOut(id=choice.id, label=choice.label))

    return schemas.QuestionOut(
        id=question.id,
        type=question.type,
        title=question.title,
        description=question.description,
        is_required=question.is_required,
        position=question.position,
        allow_multiple=question.allow_multiple,
        rating_max=question.rating_max,
        choices=choices,
        logic_jumps=snapshot.active_logic_jumps(question),
        answer_count=answer_count,
    )


def present_form_list_item(db: Session, form: Form) -> schemas.FormListItemOut:
    submitted_count = count_submitted_responses(db, form.id)
    started_count = db.scalar(select(func.count(Response.id)).where(Response.form_id == form.id))
    completion_rate = None
    if started_count > 0:
        completion_rate = round(100 * submitted_count / started_count, 1)

    return schemas.FormListItemOut(
        id=form.id,
        public_id=form.public_id,
        title=form.title,
        status=form.status,
        response_count=submitted_count,
        question_count=len(snapshot.active_questions(form)),
        completion_rate=completion_rate,
        has_unpublished_changes=snapshot.has_unpublished_changes(form),
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


def present_form_detail(db: Session, form: Form) -> schemas.FormDetailOut:
    answer_counts = count_answers_per_question(db, form.id)

    questions = []
    for question in snapshot.active_questions(form):
        questions.append(present_question(question, answer_counts.get(question.id, 0)))

    removed_on_publish = snapshot.list_removed_with_answers(db, form)
    answers_lost_on_publish = 0
    for removed in removed_on_publish:
        answers_lost_on_publish += removed["answer_count"]

    return schemas.FormDetailOut(
        id=form.id,
        public_id=form.public_id,
        title=form.title,
        status=form.status,
        response_count=count_submitted_responses(db, form.id),
        has_unpublished_changes=snapshot.has_unpublished_changes(form),
        answers_lost_on_publish=answers_lost_on_publish,
        removed_on_publish=removed_on_publish,
        theme=present_theme(form),
        welcome_enabled=form.welcome_enabled,
        welcome_title=form.welcome_title,
        welcome_text=form.welcome_text,
        welcome_button_text=form.welcome_button_text,
        thank_you_title=form.thank_you_title,
        thank_you_text=form.thank_you_text,
        published_at=form.published_at,
        created_at=form.created_at,
        updated_at=form.updated_at,
        questions=questions,
    )


def present_public_form(form: Form) -> schemas.PublicFormOut:
    """The published snapshot plus the public id. Never reads the draft."""
    published = form.published_snapshot
    return schemas.PublicFormOut(
        public_id=form.public_id,
        title=published["title"],
        theme=published["theme"],
        # .get(): snapshots published before welcome screens existed have no such key.
        welcome=published.get("welcome"),
        thank_you_title=published["thank_you_title"],
        thank_you_text=published["thank_you_text"],
        questions=published["questions"],
    )


def format_number(number: float) -> str:
    """Show 4.0 as "4" but keep 4.5 as "4.5"."""
    if number == int(number):
        return str(int(number))
    return str(number)


def present_answer(answer: Answer, choice_labels_by_id: dict[int, str]) -> schemas.AnswerOut:
    """
    `choice_labels_by_id` comes from the published snapshot, so results show the labels
    respondents actually saw, not labels the creator has since edited in the draft.
    """
    choice_labels = []
    for selected in answer.selected_choices:
        label = choice_labels_by_id.get(selected.choice_id)
        if label is None:
            label = selected.choice.label
        # Results show plain text: drop any bold / italic markers.
        choice_labels.append(strip_formatting(label))

    if answer.value_text is not None:
        display = answer.value_text
    elif answer.value_number is not None:
        display = format_number(answer.value_number)
    elif answer.value_boolean is not None:
        display = "Yes" if answer.value_boolean else "No"
    else:
        display = ", ".join(choice_labels)

    return schemas.AnswerOut(
        question_id=answer.question_id,
        text=answer.value_text,
        number=answer.value_number,
        boolean=answer.value_boolean,
        choice_labels=choice_labels,
        display=display,
    )


def choice_labels_from_snapshot(form: Form) -> dict[int, str]:
    labels: dict[int, str] = {}
    for question in snapshot.snapshot_questions(form):
        for choice in question["choices"]:
            labels[choice["id"]] = choice["label"]
    return labels


def present_response(response: Response, form: Form) -> schemas.ResponseOut:
    choice_labels_by_id = choice_labels_from_snapshot(form)
    answers = []
    for answer in response.answers:
        answers.append(present_answer(answer, choice_labels_by_id))

    return schemas.ResponseOut(
        id=response.id,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        answers=answers,
    )
