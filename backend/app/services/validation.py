"""
validation.py — server-side checking of a submitted response.

What it does:   checks every answer in a submission against the published questions and
                returns either clean values ready to store, or a list of errors.
Depends on:     schemas.py (AnswerIn), the email-validator package.
Depended on by: routers/public.py (the submit route), tests/test_validation.py.

Why this exists when the browser already validates: the public link is open to anyone,
so a request can be sent without using our page at all. The server must never trust it.
The same rules live in the frontend (src/lib/validation.ts) only to give instant feedback.

Everything here is plain functions on plain data (no database), which keeps it easy to
read and to test.
"""

import math
from dataclasses import dataclass, field

from email_validator import EmailNotValidError, validate_email

from app.schemas import AnswerIn
from app.services import logic

MAX_SHORT_TEXT_LENGTH = 1000
MAX_LONG_TEXT_LENGTH = 20000

# Wording follows Typeform's respondent-facing messages.
MESSAGE_REQUIRED = "Please fill this in"
MESSAGE_REQUIRED_CHOICE = "Oops! Please make a selection"
MESSAGE_INVALID_EMAIL = "Hmm... that email doesn't look right"
MESSAGE_INVALID_NUMBER = "Numbers only please"
MESSAGE_TEXT_TOO_LONG = "That answer is too long"
MESSAGE_INVALID_CHOICE = "That option is not part of this question"
MESSAGE_ONE_CHOICE_ONLY = "Please choose only one option"
MESSAGE_INVALID_RATING = "Please pick a rating from the scale"
MESSAGE_UNKNOWN_QUESTION = "This question is not part of the form"
MESSAGE_DUPLICATE_ANSWER = "This question was answered more than once"


@dataclass
class CleanAnswer:
    """A validated answer, shaped like a row of the `answers` table."""

    question_id: int
    text: str | None = None
    number: float | None = None
    boolean: bool | None = None
    choice_ids: list[int] = field(default_factory=list)


@dataclass
class AnswerError:
    question_id: int
    message: str


def validate_answer(question: dict, answer: AnswerIn | None) -> tuple[CleanAnswer | None, str | None]:
    """
    Check one answer against one question from the published snapshot.

    Returns (clean_answer, error_message). Exactly one of them is set, except when the
    question was optional and left empty: then both are None and nothing is stored.
    """
    question_type = question["type"]
    is_required = question["is_required"]
    question_id = question["id"]

    if question_type in ("short_text", "long_text", "email"):
        text = ""
        if answer is not None and answer.text is not None:
            text = answer.text.strip()

        if text == "":
            if is_required:
                return None, MESSAGE_REQUIRED
            return None, None

        if question_type == "short_text" and len(text) > MAX_SHORT_TEXT_LENGTH:
            return None, MESSAGE_TEXT_TOO_LONG
        if question_type == "long_text" and len(text) > MAX_LONG_TEXT_LENGTH:
            return None, MESSAGE_TEXT_TOO_LONG

        if question_type == "email":
            try:
                # check_deliverability=False: only the format is checked. Looking up the
                # domain would need the network and would slow every submission down.
                validate_email(text, check_deliverability=False)
            except EmailNotValidError:
                return None, MESSAGE_INVALID_EMAIL

        return CleanAnswer(question_id=question_id, text=text), None

    if question_type == "number":
        number = None
        if answer is not None:
            number = answer.number

        if number is None:
            if is_required:
                return None, MESSAGE_REQUIRED
            return None, None

        # JSON cannot carry NaN or Infinity, but a hand-made request could try.
        if math.isnan(number) or math.isinf(number):
            return None, MESSAGE_INVALID_NUMBER

        return CleanAnswer(question_id=question_id, number=number), None

    if question_type == "rating":
        number = None
        if answer is not None:
            number = answer.number

        if number is None:
            if is_required:
                return None, MESSAGE_REQUIRED_CHOICE
            return None, None

        is_whole_number = number == int(number)
        if not is_whole_number or number < 1 or number > question["rating_max"]:
            return None, MESSAGE_INVALID_RATING

        return CleanAnswer(question_id=question_id, number=number), None

    if question_type == "yes_no":
        boolean = None
        if answer is not None:
            boolean = answer.boolean

        if boolean is None:
            if is_required:
                return None, MESSAGE_REQUIRED_CHOICE
            return None, None

        return CleanAnswer(question_id=question_id, boolean=boolean), None

    if question_type in ("multiple_choice", "dropdown"):
        choice_ids: list[int] = []
        if answer is not None and answer.choice_ids is not None:
            # Remove repeats while keeping order, so one choice cannot be counted twice.
            for choice_id in answer.choice_ids:
                if choice_id not in choice_ids:
                    choice_ids.append(choice_id)

        if len(choice_ids) == 0:
            if is_required:
                return None, MESSAGE_REQUIRED_CHOICE
            return None, None

        valid_choice_ids = [choice["id"] for choice in question["choices"]]
        for choice_id in choice_ids:
            if choice_id not in valid_choice_ids:
                return None, MESSAGE_INVALID_CHOICE

        # A dropdown is always single-select; multiple choice only if the creator
        # switched "allow multiple" on.
        allows_many = question_type == "multiple_choice" and question["allow_multiple"]
        if not allows_many and len(choice_ids) > 1:
            return None, MESSAGE_ONE_CHOICE_ONLY

        return CleanAnswer(question_id=question_id, choice_ids=choice_ids), None

    # Unreachable for snapshots we wrote ourselves; fail loudly rather than store junk.
    raise ValueError(f"Unknown question type: {question_type}")


def validate_submission(questions: list[dict], answers: list[AnswerIn]) -> tuple[list[CleanAnswer], list[AnswerError]]:
    """
    Check a whole submission.

    Why we walk the QUESTIONS and not the submitted answers: a required question that
    the request simply left out must still produce an error.

    Why we walk them along the logic-jump path: a question the respondent was jumped
    past was never shown, so it must not be demanded even if it is required, and any
    answer sent for it is ignored rather than stored.
    """
    errors: list[AnswerError] = []
    clean_answers: list[CleanAnswer] = []

    known_question_ids = [question["id"] for question in questions]
    answers_by_question_id: dict[int, AnswerIn] = {}
    for answer in answers:
        if answer.question_id not in known_question_ids:
            errors.append(AnswerError(answer.question_id, MESSAGE_UNKNOWN_QUESTION))
            continue
        if answer.question_id in answers_by_question_id:
            errors.append(AnswerError(answer.question_id, MESSAGE_DUPLICATE_ANSWER))
            continue
        answers_by_question_id[answer.question_id] = answer

    current_index = 0 if len(questions) > 0 else logic.END_OF_FORM
    while current_index != logic.END_OF_FORM:
        question = questions[current_index]
        answer = answers_by_question_id.get(question["id"])
        clean_answer, error_message = validate_answer(question, answer)

        if error_message is not None:
            errors.append(AnswerError(question["id"], error_message))
        elif clean_answer is not None:
            clean_answers.append(clean_answer)

        # Decide where to go next from the validated answer. An invalid or missing
        # answer matches no rule (except "always"), so the walk just carries on.
        number = None
        boolean = None
        choice_ids: list[int] = []
        if clean_answer is not None:
            number = clean_answer.number
            boolean = clean_answer.boolean
            choice_ids = clean_answer.choice_ids
        current_index = logic.next_question_index(questions, current_index, number, boolean, choice_ids)

    return clean_answers, errors
