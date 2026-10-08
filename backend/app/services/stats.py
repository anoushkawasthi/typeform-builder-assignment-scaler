"""
stats.py — summary numbers for a form's results page.

What it does:   builds the per-question summary (counts per choice, yes/no split, rating
                spread, averages, latest text answers) and the completion rate.
Depends on:     models.py, schemas.py, services/snapshot.py.
Depended on by: routers/responses.py.

The counting is done by the database with GROUP BY rather than by loading every answer
into Python. That is what having one row per answer buys us.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import schemas
from app.models import Answer, AnswerChoice, Form, Response
from app.services import snapshot

RECENT_TEXTS_LIMIT = 5


def submitted_answers_query(question_id: int):
    """
    Base filter shared by every statistic: answers to one question that belong to a
    submitted response. (Answers only exist for submitted responses today; joining
    Response keeps that true even if partial answers are ever stored.)
    """
    return (
        select(Answer)
        .join(Response, Answer.response_id == Response.id)
        .where(Answer.question_id == question_id, Response.submitted_at.is_not(None))
    )


def count_answers(db: Session, question_id: int) -> int:
    query = submitted_answers_query(question_id).with_only_columns(func.count(Answer.id))
    return db.scalar(query)


def choice_buckets(db: Session, question: dict) -> list[schemas.BucketOut]:
    """One bucket per choice, in the form's order, including choices nobody picked."""
    rows = db.execute(
        select(AnswerChoice.choice_id, func.count())
        .join(Answer, AnswerChoice.answer_id == Answer.id)
        .join(Response, Answer.response_id == Response.id)
        .where(Answer.question_id == question["id"], Response.submitted_at.is_not(None))
        .group_by(AnswerChoice.choice_id)
    ).all()

    count_by_choice_id: dict[int, int] = {}
    for choice_id, pick_count in rows:
        count_by_choice_id[choice_id] = pick_count

    buckets = []
    for choice in question["choices"]:
        buckets.append(schemas.BucketOut(label=choice["label"], count=count_by_choice_id.get(choice["id"], 0)))
    return buckets


def yes_no_buckets(db: Session, question: dict) -> list[schemas.BucketOut]:
    query = (
        submitted_answers_query(question["id"])
        .with_only_columns(Answer.value_boolean, func.count(Answer.id))
        .group_by(Answer.value_boolean)
    )
    count_by_value: dict[bool, int] = {}
    for value, answer_count in db.execute(query).all():
        count_by_value[value] = answer_count

    return [
        schemas.BucketOut(label="Yes", count=count_by_value.get(True, 0)),
        schemas.BucketOut(label="No", count=count_by_value.get(False, 0)),
    ]


def rating_buckets(db: Session, question: dict) -> list[schemas.BucketOut]:
    """One bucket per point on the scale (1, 2, ... rating_max)."""
    query = (
        submitted_answers_query(question["id"])
        .with_only_columns(Answer.value_number, func.count(Answer.id))
        .group_by(Answer.value_number)
    )
    count_by_value: dict[int, int] = {}
    for value, answer_count in db.execute(query).all():
        count_by_value[int(value)] = answer_count

    buckets = []
    for rating in range(1, question["rating_max"] + 1):
        buckets.append(schemas.BucketOut(label=str(rating), count=count_by_value.get(rating, 0)))
    return buckets


def average_number(db: Session, question_id: int) -> float | None:
    query = submitted_answers_query(question_id).with_only_columns(func.avg(Answer.value_number))
    average = db.scalar(query)
    if average is None:
        return None
    return round(average, 2)


def recent_texts(db: Session, question_id: int) -> list[str]:
    query = (
        submitted_answers_query(question_id)
        .with_only_columns(Answer.value_text)
        .order_by(Response.submitted_at.desc())
        .limit(RECENT_TEXTS_LIMIT)
    )
    return list(db.scalars(query).all())


def summarize_question(db: Session, question: dict) -> schemas.QuestionSummaryOut:
    question_type = question["type"]
    buckets: list[schemas.BucketOut] = []
    average = None
    texts: list[str] = []

    if question_type in ("multiple_choice", "dropdown"):
        buckets = choice_buckets(db, question)
    elif question_type == "yes_no":
        buckets = yes_no_buckets(db, question)
    elif question_type == "rating":
        buckets = rating_buckets(db, question)
        average = average_number(db, question["id"])
    elif question_type == "number":
        average = average_number(db, question["id"])
    else:
        texts = recent_texts(db, question["id"])

    return schemas.QuestionSummaryOut(
        question_id=question["id"],
        type=question_type,
        title=question["title"],
        answer_count=count_answers(db, question["id"]),
        buckets=buckets,
        average=average,
        recent_texts=texts,
    )


def summarize_form(db: Session, form: Form) -> schemas.FormSummaryOut:
    started_count = db.scalar(select(func.count(Response.id)).where(Response.form_id == form.id))
    submitted_count = db.scalar(
        select(func.count(Response.id)).where(Response.form_id == form.id, Response.submitted_at.is_not(None))
    )

    completion_rate = None
    if started_count > 0:
        completion_rate = round(100 * submitted_count / started_count, 1)

    question_summaries = []
    for question in snapshot.snapshot_questions(form):
        question_summaries.append(summarize_question(db, question))

    return schemas.FormSummaryOut(
        started_count=started_count,
        submitted_count=submitted_count,
        completion_rate=completion_rate,
        questions=question_summaries,
    )
