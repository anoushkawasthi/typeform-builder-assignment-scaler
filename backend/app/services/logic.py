"""
logic.py — logic jumps: deciding which question comes next.

What it does:   given a question's rules and the answer to it, works out where the
                respondent goes next. Also checks that a rule makes sense for its
                question before it is saved.
Depends on:     nothing in this app (plain functions on plain data).
Depended on by: services/validation.py (to know which questions a respondent actually
                saw), routers/logic_jumps.py (rule checks), seed.py.

The same decision is made in the browser (frontend/src/lib/logic.ts) to move the
respondent along. The server repeats it because it cannot trust the browser: when a
response arrives, it re-walks the form to find the questions that were really on the
path, and only those are validated and stored.

A rule, as stored in the published snapshot, looks like:
    {"operator": "is", "compare_choice_id": 12, "compare_number": None,
     "compare_boolean": None, "target_question_id": 7}
`target_question_id` of None means "go to the end of the form".
"""

# Which comparisons each question type supports. "always" (an unconditional jump) is
# allowed everywhere; text-like types support nothing else.
OPERATORS_BY_QUESTION_TYPE = {
    "short_text": ["always"],
    "long_text": ["always"],
    "email": ["always"],
    "multiple_choice": ["always", "is", "is_not"],
    "dropdown": ["always", "is", "is_not"],
    "yes_no": ["always", "is"],
    "number": ["always", "is", "less_than", "greater_than"],
    "rating": ["always", "is", "less_than", "greater_than"],
}

# Returned by next_question_index when the form should end.
END_OF_FORM = -1


def rule_matches(rule: dict, number: float | None, boolean: bool | None, choice_ids: list[int]) -> bool:
    """
    Does one rule apply to one answer?

    The answer is passed as its three possible values; the ones that do not apply to
    the question's type are None / empty. An unanswered question matches only "always".
    """
    operator = rule["operator"]
    if operator == "always":
        return True

    if rule["compare_choice_id"] is not None:
        if len(choice_ids) == 0:
            return False
        is_picked = rule["compare_choice_id"] in choice_ids
        if operator == "is":
            return is_picked
        if operator == "is_not":
            return not is_picked
        return False

    if rule["compare_boolean"] is not None:
        if boolean is None:
            return False
        return operator == "is" and boolean == rule["compare_boolean"]

    if rule["compare_number"] is not None:
        if number is None:
            return False
        if operator == "is":
            return number == rule["compare_number"]
        if operator == "less_than":
            return number < rule["compare_number"]
        if operator == "greater_than":
            return number > rule["compare_number"]
        return False

    # A rule with an operator but nothing to compare with never matches.
    return False


def next_question_index(
    questions: list[dict],
    current_index: int,
    number: float | None,
    boolean: bool | None,
    choice_ids: list[int],
) -> int:
    """
    The index of the question to show after `current_index`, or END_OF_FORM.

    The first matching rule wins. A rule may only jump FORWARD: a target that is not
    later in the form is ignored, which makes endless loops impossible even if questions
    were reordered after the rule was written.
    """
    question = questions[current_index]

    for rule in question.get("logic_jumps", []):
        if not rule_matches(rule, number, boolean, choice_ids):
            continue

        if rule["target_question_id"] is None:
            return END_OF_FORM

        for index, candidate in enumerate(questions):
            if candidate["id"] == rule["target_question_id"] and index > current_index:
                return index
        # Target missing or not ahead of us: ignore this rule and try the next one.

    following_index = current_index + 1
    if following_index >= len(questions):
        return END_OF_FORM
    return following_index


def check_rule(question_type: str, operator: str, has_choice: bool, has_number: bool, has_boolean: bool) -> str | None:
    """
    Is this rule valid for this type of question? Returns an error message or None.

    Why check on the server: a rule that compares a text question with a number would
    never match, and a creator would be left wondering why their jump does nothing.
    """
    allowed_operators = OPERATORS_BY_QUESTION_TYPE[question_type]
    if operator not in allowed_operators:
        return f"'{operator}' can't be used on a {question_type} question"

    if operator == "always":
        return None

    if question_type in ("multiple_choice", "dropdown") and not has_choice:
        return "Pick the choice to compare with"
    if question_type == "yes_no" and not has_boolean:
        return "Pick Yes or No to compare with"
    if question_type in ("number", "rating") and not has_number:
        return "Enter the number to compare with"
    return None
