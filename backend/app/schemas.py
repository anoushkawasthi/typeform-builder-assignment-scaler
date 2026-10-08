"""
schemas.py — the shapes of JSON going in and out of the API (Pydantic models).

What it does:   declares what each request body must look like and what each response
                contains. FastAPI uses these to validate input and to write the API docs.
Depends on:     models.py (only for the list of question types).
Depended on by: every router, presenters.py, services/validation.py.

Naming: `...In` / `...Create` / `...Update` are request bodies; `...Out` are responses.
These are separate from the SQLAlchemy classes in models.py on purpose: the database
layout and the API layout are allowed to differ (for example, `response_count` is in the
API but is not a column).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

QuestionType = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]

# ----------------------------------------------------------------------------------------
# Questions and choices (creator side)
# ----------------------------------------------------------------------------------------


class ChoiceOut(BaseModel):
    id: int
    label: str


class ChoiceIn(BaseModel):
    """A choice sent by the builder. `id` is missing for a choice that was just added."""

    id: int | None = None
    label: str = Field(default="", max_length=255)


class QuestionOut(BaseModel):
    id: int
    type: QuestionType
    title: str
    description: str
    is_required: bool
    position: int
    allow_multiple: bool
    rating_max: int
    choices: list[ChoiceOut]
    # How many submitted answers this question has. The builder uses it to warn before
    # deleting and to lock the type.
    answer_count: int


class QuestionCreate(BaseModel):
    type: QuestionType
    # Index to insert at. Left out = add to the end.
    position: int | None = Field(default=None, ge=0)


class QuestionUpdate(BaseModel):
    """Every field is optional: the builder autosaves only what changed."""

    type: QuestionType | None = None
    title: str | None = Field(default=None, max_length=2000)
    description: str | None = Field(default=None, max_length=5000)
    is_required: bool | None = None
    allow_multiple: bool | None = None
    rating_max: int | None = Field(default=None, ge=1, le=10)
    # When present, this is the complete ordered list of choices for the question.
    choices: list[ChoiceIn] | None = None


class QuestionOrderIn(BaseModel):
    """The ids of all of a form's questions, in their new order."""

    question_ids: list[int]


# ----------------------------------------------------------------------------------------
# Forms (creator side)
# ----------------------------------------------------------------------------------------


class ThemeOut(BaseModel):
    background_color: str
    question_color: str
    answer_color: str
    button_color: str
    button_text_color: str
    font: str


class FormListItemOut(BaseModel):
    """One row of the form list on the home screen."""

    id: int
    public_id: str
    title: str
    status: Literal["draft", "published"]
    response_count: int
    question_count: int
    has_unpublished_changes: bool
    created_at: datetime
    updated_at: datetime


class FormDetailOut(BaseModel):
    """Everything the builder needs to edit one form."""

    id: int
    public_id: str
    title: str
    status: Literal["draft", "published"]
    response_count: int
    has_unpublished_changes: bool
    # Number of stored answers that will be permanently removed on the next publish,
    # because their question or choice was deleted from the draft.
    answers_lost_on_publish: int
    theme: ThemeOut
    thank_you_title: str
    thank_you_text: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    questions: list[QuestionOut]


class FormCreate(BaseModel):
    title: str = Field(default="My new form", min_length=1, max_length=255)


HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


class FormUpdate(BaseModel):
    """Every field is optional: rename, theme and thank-you edits all use this."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    thank_you_title: str | None = Field(default=None, max_length=255)
    thank_you_text: str | None = Field(default=None, max_length=5000)
    theme_background_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    theme_question_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    theme_answer_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    theme_button_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    theme_button_text_color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    theme_font: str | None = Field(default=None, max_length=60)


# ----------------------------------------------------------------------------------------
# Public form filling (respondent side)
# ----------------------------------------------------------------------------------------


class PublicQuestionOut(BaseModel):
    """A question as stored in the published snapshot."""

    id: int
    type: QuestionType
    title: str
    description: str
    is_required: bool
    allow_multiple: bool
    rating_max: int
    choices: list[ChoiceOut]


class PublicFormOut(BaseModel):
    """What a respondent's browser receives: the published snapshot, nothing else."""

    public_id: str
    title: str
    theme: ThemeOut
    thank_you_title: str
    thank_you_text: str
    questions: list[PublicQuestionOut]


class ResponseStartOut(BaseModel):
    token: str


class AnswerIn(BaseModel):
    """
    One answer in a submission. The field that is filled in depends on the question
    type, mirroring the columns of the `answers` table:
      text       -> short_text, long_text, email
      number     -> number, rating
      boolean    -> yes_no
      choice_ids -> multiple_choice, dropdown
    """

    question_id: int
    text: str | None = None
    number: float | None = None
    boolean: bool | None = None
    choice_ids: list[int] | None = None


class SubmitIn(BaseModel):
    answers: list[AnswerIn]


class AnswerErrorOut(BaseModel):
    question_id: int
    message: str


# ----------------------------------------------------------------------------------------
# Results (creator side)
# ----------------------------------------------------------------------------------------


class AnswerOut(BaseModel):
    question_id: int
    text: str | None
    number: float | None
    boolean: bool | None
    choice_labels: list[str]
    # The answer as one printable string, so tables do not need per-type logic.
    display: str


class ResponseOut(BaseModel):
    id: int
    started_at: datetime
    submitted_at: datetime
    answers: list[AnswerOut]


class ResponsesTableOut(BaseModel):
    """Table view: the questions are the columns, each response is a row."""

    questions: list[PublicQuestionOut]
    responses: list[ResponseOut]


class ResponseDetailOut(BaseModel):
    """One response in full, with the questions it answers."""

    form_id: int
    form_title: str
    questions: list[PublicQuestionOut]
    response: ResponseOut


class BucketOut(BaseModel):
    """One bar of a summary chart, e.g. label="Yes", count=12."""

    label: str
    count: int


class QuestionSummaryOut(BaseModel):
    question_id: int
    type: QuestionType
    title: str
    answer_count: int
    # Counts per choice / per yes-no / per rating value. Empty for text questions.
    buckets: list[BucketOut]
    # Mean of the answers, for number and rating questions only.
    average: float | None
    # A few of the latest answers, for text-like questions only.
    recent_texts: list[str]


class FormSummaryOut(BaseModel):
    started_count: int
    submitted_count: int
    # submitted / started, as a percentage from 0 to 100. None when nobody has started.
    completion_rate: float | None
    questions: list[QuestionSummaryOut]
