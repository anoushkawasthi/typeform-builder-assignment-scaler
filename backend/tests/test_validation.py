"""
test_validation.py — the server-side answer rules, tested as plain functions.

These call services/validation.py directly with hand-written question dictionaries, so
they run without a database or a web server.
"""

from app.schemas import AnswerIn
from app.services import validation
from app.services.validation import validate_answer, validate_submission


def make_question(question_type: str, **overrides) -> dict:
    question = {
        "id": 1,
        "type": question_type,
        "title": "Q",
        "description": "",
        "is_required": False,
        "allow_multiple": False,
        "rating_max": 5,
        "choices": [{"id": 10, "label": "A"}, {"id": 11, "label": "B"}],
    }
    question.update(overrides)
    return question


def test_required_text_rejects_blank_and_whitespace():
    question = make_question("short_text", is_required=True)
    assert validate_answer(question, None) == (None, validation.MESSAGE_REQUIRED)
    assert validate_answer(question, AnswerIn(question_id=1, text="   ")) == (None, validation.MESSAGE_REQUIRED)


def test_optional_question_left_empty_stores_nothing():
    assert validate_answer(make_question("long_text"), None) == (None, None)


def test_text_is_trimmed():
    clean, error = validate_answer(make_question("short_text"), AnswerIn(question_id=1, text="  hi  "))
    assert error is None
    assert clean.text == "hi"


def test_short_text_has_a_length_limit():
    too_long = "x" * (validation.MAX_SHORT_TEXT_LENGTH + 1)
    _, error = validate_answer(make_question("short_text"), AnswerIn(question_id=1, text=too_long))
    assert error == validation.MESSAGE_TEXT_TOO_LONG


def test_email_format():
    question = make_question("email")
    _, error = validate_answer(question, AnswerIn(question_id=1, text="not-an-email"))
    assert error == validation.MESSAGE_INVALID_EMAIL
    clean, error = validate_answer(question, AnswerIn(question_id=1, text="ann@example.com"))
    assert error is None
    assert clean.text == "ann@example.com"


def test_number_accepts_decimals_and_rejects_infinity():
    question = make_question("number")
    clean, error = validate_answer(question, AnswerIn(question_id=1, number=2.5))
    assert error is None and clean.number == 2.5
    _, error = validate_answer(question, AnswerIn(question_id=1, number=float("inf")))
    assert error == validation.MESSAGE_INVALID_NUMBER


def test_rating_must_be_a_whole_number_on_the_scale():
    question = make_question("rating", rating_max=5)
    assert validate_answer(question, AnswerIn(question_id=1, number=5))[1] is None
    assert validate_answer(question, AnswerIn(question_id=1, number=6))[1] == validation.MESSAGE_INVALID_RATING
    assert validate_answer(question, AnswerIn(question_id=1, number=0))[1] == validation.MESSAGE_INVALID_RATING
    assert validate_answer(question, AnswerIn(question_id=1, number=2.5))[1] == validation.MESSAGE_INVALID_RATING


def test_yes_no_false_counts_as_an_answer():
    # "No" is a real answer. A naive `if not value` check would wrongly call it empty.
    question = make_question("yes_no", is_required=True)
    clean, error = validate_answer(question, AnswerIn(question_id=1, boolean=False))
    assert error is None and clean.boolean is False


def test_choice_must_belong_to_the_question():
    question = make_question("multiple_choice")
    _, error = validate_answer(question, AnswerIn(question_id=1, choice_ids=[999]))
    assert error == validation.MESSAGE_INVALID_CHOICE


def test_single_select_rejects_two_choices_but_multi_select_allows_them():
    answer = AnswerIn(question_id=1, choice_ids=[10, 11])
    assert validate_answer(make_question("multiple_choice"), answer)[1] == validation.MESSAGE_ONE_CHOICE_ONLY
    assert validate_answer(make_question("dropdown"), answer)[1] == validation.MESSAGE_ONE_CHOICE_ONLY
    clean, error = validate_answer(make_question("multiple_choice", allow_multiple=True), answer)
    assert error is None and clean.choice_ids == [10, 11]


def test_repeated_choice_is_counted_once():
    question = make_question("multiple_choice", allow_multiple=True)
    clean, _ = validate_answer(question, AnswerIn(question_id=1, choice_ids=[10, 10]))
    assert clean.choice_ids == [10]


def test_submission_reports_required_questions_that_were_left_out():
    questions = [make_question("short_text", id=1, is_required=True), make_question("number", id=2)]
    clean, errors = validate_submission(questions, [AnswerIn(question_id=2, number=3)])
    assert [(error.question_id, error.message) for error in errors] == [(1, validation.MESSAGE_REQUIRED)]


def test_submission_rejects_unknown_and_duplicate_questions():
    questions = [make_question("short_text", id=1)]
    answers = [
        AnswerIn(question_id=1, text="a"),
        AnswerIn(question_id=1, text="b"),
        AnswerIn(question_id=77, text="c"),
    ]
    _, errors = validate_submission(questions, answers)
    messages = sorted(error.message for error in errors)
    assert messages == sorted([validation.MESSAGE_DUPLICATE_ANSWER, validation.MESSAGE_UNKNOWN_QUESTION])


def test_rule_matching_by_type():
    from app.services import logic

    choice_rule = {"operator": "is_not", "compare_choice_id": 10, "compare_number": None, "compare_boolean": None}
    assert logic.rule_matches(choice_rule, None, None, [11]) is True
    assert logic.rule_matches(choice_rule, None, None, [10]) is False
    # No answer at all never matches a comparison.
    assert logic.rule_matches(choice_rule, None, None, []) is False

    number_rule = {"operator": "greater_than", "compare_choice_id": None, "compare_number": 3, "compare_boolean": None}
    assert logic.rule_matches(number_rule, 4, None, []) is True
    assert logic.rule_matches(number_rule, 3, None, []) is False

    always_rule = {"operator": "always", "compare_choice_id": None, "compare_number": None, "compare_boolean": None}
    assert logic.rule_matches(always_rule, None, None, []) is True


def test_a_jump_that_points_backwards_is_ignored():
    from app.services import logic

    questions = [
        make_question("short_text", id=1),
        make_question("short_text", id=2, logic_jumps=[
            {"operator": "always", "compare_choice_id": None, "compare_number": None, "compare_boolean": None, "target_question_id": 1}
        ]),
        make_question("short_text", id=3),
    ]
    # From question 2 the backward rule is skipped and the form just continues to 3.
    assert logic.next_question_index(questions, 1, None, None, []) == 2
    # From the last question the form ends.
    assert logic.next_question_index(questions, 2, None, None, []) == logic.END_OF_FORM


def test_strip_formatting_removes_bold_and_italic_markers():
    from app.services.text import strip_formatting

    assert strip_formatting("Pick your **favourite** *fruit*") == "Pick your favourite fruit"
    # A lone asterisk is ordinary text and is kept.
    assert strip_formatting("5 * 3") == "5 * 3"
    assert strip_formatting("plain") == "plain"
