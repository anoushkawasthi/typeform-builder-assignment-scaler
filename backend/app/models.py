"""
models.py — the database tables, written as SQLAlchemy classes.

What it does:   defines the seven tables and how they relate to each other.
Depends on:     database.py (for `Base`).
Depended on by: every router and service, and seed.py.

The relationships, read top to bottom:

    creators 1──* forms 1──* questions 1──* question_choices
                    │             │                 │
                    │             *                 *
                    └──* responses 1──* answers 1──* answer_choices

A form belongs to a creator and has ordered questions. Choice-type questions have ordered
choices. Each time a person fills a form we store one response; each question they
answered is one answer row; each choice they picked is one answer_choices row.
"""

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.database import Base

# The eight question types the brief asks for. Stored as plain strings in questions.type.
QUESTION_TYPES = [
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]

# Types whose answer is one or more rows in question_choices.
CHOICE_QUESTION_TYPES = ["multiple_choice", "dropdown"]

FORM_STATUS_DRAFT = "draft"
FORM_STATUS_PUBLISHED = "published"


def utc_now() -> datetime:
    """Current time in UTC. One helper so every timestamp is produced the same way."""
    return datetime.now(timezone.utc)


class UtcDateTime(TypeDecorator):
    """
    A DateTime column that always comes back marked as UTC.

    Why: SQLite has no timezone-aware date type, so it silently drops the timezone when
    saving. Without this, the API would send "2026-10-09T10:00:00" with no zone, and the
    browser would wrongly treat it as local time. We re-attach UTC on the way out.
    """

    impl = DateTime
    cache_ok = True

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc)


class Creator(Base):
    """A person who builds forms. The app assumes one default creator (see auth.py)."""

    __tablename__ = "creators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now)

    forms: Mapped[list["Form"]] = relationship(back_populates="creator", cascade="all, delete-orphan")


class Form(Base):
    """
    One form. The rows in `questions` are the DRAFT the creator edits.
    `published_snapshot` is a frozen copy of the form taken when Publish was pressed;
    it is what respondents see. See services/snapshot.py for why.
    """

    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("creators.id", ondelete="CASCADE"), index=True)

    # Random string used in the public link (/to/<public_id>), so links cannot be guessed
    # by counting 1, 2, 3.
    public_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)

    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default=FORM_STATUS_DRAFT)

    published_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    # Theme. Plain columns rather than a JSON blob so each setting is visible in the schema.
    theme_background_color: Mapped[str] = mapped_column(String(9), default="#FFFFFF")
    theme_question_color: Mapped[str] = mapped_column(String(9), default="#000000")
    theme_answer_color: Mapped[str] = mapped_column(String(9), default="#0445AF")
    theme_button_color: Mapped[str] = mapped_column(String(9), default="#0445AF")
    theme_button_text_color: Mapped[str] = mapped_column(String(9), default="#FFFFFF")
    theme_font: Mapped[str] = mapped_column(String(60), default="system")

    # Text of the screen shown after submitting.
    thank_you_title: Mapped[str] = mapped_column(String(255), default="Thank you!")
    thank_you_text: Mapped[str] = mapped_column(Text, default="Your response has been recorded.")

    created_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now)
    # Bumped on every draft edit; comparing it with published_at tells us whether there
    # are unpublished changes.
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now)

    creator: Mapped["Creator"] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Question.position"
    )
    responses: Mapped[list["Response"]] = relationship(back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    """One question in a form's draft. `position` gives the order (0 = first)."""

    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)

    type: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    # Settings that only some types use. Kept as columns because there are only two.
    allow_multiple: Mapped[bool] = mapped_column(Boolean, default=False)  # multiple_choice
    rating_max: Mapped[int] = mapped_column(Integer, default=5)  # rating

    # Soft delete. Set when a question that respondents can still see (it is in the
    # published snapshot) is removed from the draft. The row is really deleted on the
    # next publish. Until then, answers to the live form still have a row to point at.
    deleted_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    form: Mapped["Form"] = relationship(back_populates="questions")
    choices: Mapped[list["QuestionChoice"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="QuestionChoice.position"
    )
    answers: Mapped[list["Answer"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class QuestionChoice(Base):
    """One option of a multiple-choice or dropdown question."""

    __tablename__ = "question_choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(255), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Same soft-delete rule as questions.
    deleted_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    question: Mapped["Question"] = relationship(back_populates="choices")


class Response(Base):
    """
    One person's pass through a form.

    The row is created when they START (so we can count people who gave up), and
    `submitted_at` is filled in when they finish. A response with no submitted_at is a
    partial response and has no answers.
    """

    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)

    # Random handle given to the respondent's browser so it can submit this response
    # later without being able to touch anyone else's.
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    started_at: Mapped[datetime] = mapped_column(UtcDateTime, default=utc_now)
    submitted_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    form: Mapped["Form"] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    """
    The answer to one question within one response.

    Exactly one kind of value is filled in, depending on the question type:
      short_text, long_text, email -> value_text
      number, rating               -> value_number
      yes_no                       -> value_boolean
      multiple_choice, dropdown    -> rows in answer_choices (no value column)
    """

    __tablename__ = "answers"
    # A response can answer each question only once.
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_response_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)

    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_number: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    response: Mapped["Response"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")
    selected_choices: Mapped[list["AnswerChoice"]] = relationship(
        back_populates="answer", cascade="all, delete-orphan"
    )


class AnswerChoice(Base):
    """Join table: which choices were picked in a choice-type answer."""

    __tablename__ = "answer_choices"

    answer_id: Mapped[int] = mapped_column(ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True)
    choice_id: Mapped[int] = mapped_column(ForeignKey("question_choices.id", ondelete="CASCADE"), primary_key=True)

    answer: Mapped["Answer"] = relationship(back_populates="selected_choices")
    choice: Mapped["QuestionChoice"] = relationship()
