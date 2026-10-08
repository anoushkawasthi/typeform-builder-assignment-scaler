"""
seed.py — sample data, so the app is usable the moment it starts.

What it does:   creates the default creator, two published forms that together use all
                eight question types, a set of made-up responses for each, and one draft.
Depends on:     auth.py, database.py, models.py, services/snapshot.py.
Depended on by: main.py (calls `seed_if_empty` on startup).

Run by hand to wipe and rebuild the database:   python -m app.seed --reset
"""

import random
import secrets
import sys
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_or_create_default_creator
from app.database import Base, SessionLocal, engine
from app.models import Answer, AnswerChoice, Creator, Form, LogicJump, Question, QuestionChoice, Response, utc_now
from app.services import logic, snapshot

# Fixed public ids so the demo links in the README keep working after a re-seed.
FEEDBACK_FORM_PUBLIC_ID = "demoFdbk"
EVENT_FORM_PUBLIC_ID = "demoEvnt"

FIRST_NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Sara", "Vikram", "Zoya", "Ishaan", "Tara", "Neil", "Anya"]
COMPANIES = ["Northwind", "Globex", "Initech", "Umbrella", "Hooli", "Acme"]
FEEDBACK_COMMENTS = [
    "The onboarding was smooth, but I'd love more templates.",
    "Really fast support. Keep it up!",
    "Pricing page was a bit confusing.",
    "Works well on my phone, which I did not expect.",
    "Exports could be easier to find.",
    "Nothing to add, it does what I need.",
]
DIETARY_NOTES = ["No peanuts please", "Vegan", "Gluten free", "Lactose intolerant"]


def add_question(form: Form, question_type: str, title: str, **settings) -> Question:
    """
    Append a question to a form. `settings` may hold description, is_required,
    allow_multiple, rating_max and `choices` (a list of labels).
    """
    choice_labels = settings.pop("choices", [])
    question = Question(type=question_type, title=title, position=len(form.questions), **settings)
    for position, label in enumerate(choice_labels):
        question.choices.append(QuestionChoice(label=label, position=position))
    form.questions.append(question)
    return question


def build_feedback_form(creator: Creator) -> Form:
    form = Form(creator_id=creator.id, public_id=FEEDBACK_FORM_PUBLIC_ID, title="Customer Feedback Survey")
    add_question(form, "short_text", "First off, what's your name?", is_required=True)
    add_question(
        form,
        "email",
        "What's the best email to reach you on?",
        description="We'll only use it to follow up on your feedback.",
        is_required=True,
    )
    add_question(form, "rating", "How would you rate your overall experience?", is_required=True, rating_max=5)
    add_question(
        form,
        "multiple_choice",
        "Which features do you use the most?",
        description="Choose as many as you like.",
        allow_multiple=True,
        choices=["Form builder", "Templates", "Integrations", "Analytics", "Sharing"],
    )
    add_question(form, "yes_no", "Would you recommend us to a friend?", is_required=True)
    add_question(
        form,
        "dropdown",
        "How did you hear about us?",
        choices=["Search engine", "Social media", "A friend or colleague", "Blog or article", "Other"],
    )
    add_question(form, "number", "How many people are on your team?", description="A rough number is fine.")
    add_question(form, "long_text", "Anything else you'd like us to know?")
    return form


def build_event_form(creator: Creator) -> Form:
    form = Form(
        creator_id=creator.id,
        public_id=EVENT_FORM_PUBLIC_ID,
        title="Product Launch Meetup — RSVP",
        thank_you_title="You're on the list!",
        thank_you_text="We'll email you the details a week before the event.",
    )
    add_question(form, "short_text", "What's your full name?", is_required=True)
    add_question(form, "email", "Where should we send your ticket?", is_required=True)
    add_question(form, "yes_no", "Will you be joining us in person?", is_required=True)
    add_question(
        form,
        "multiple_choice",
        "Which session are you most excited about?",
        is_required=True,
        choices=["Keynote", "Hands-on workshop", "Customer panel", "Networking"],
    )
    add_question(form, "number", "How many guests are you bringing?", description="Enter 0 if it's just you.")
    add_question(form, "short_text", "Which company are you with?")
    add_question(form, "long_text", "Any dietary requirements or accessibility needs?")
    add_question(form, "rating", "How excited are you?", rating_max=10)
    return form


def build_draft_form(creator: Creator) -> Form:
    form = Form(creator_id=creator.id, public_id=secrets.token_urlsafe(6), title="Job Application (draft)")
    add_question(form, "short_text", "What's your name?", is_required=True)
    add_question(form, "email", "And your email?", is_required=True)
    add_question(
        form,
        "dropdown",
        "Which role are you applying for?",
        choices=["Frontend Engineer", "Backend Engineer", "Fullstack Engineer", "Designer"],
    )
    return form


def make_fake_answer(question: Question, rng: random.Random, person_name: str) -> Answer | None:
    """
    Invent a believable answer for one question. Optional questions are skipped about
    one time in four, so the results pages show realistic gaps.
    """
    if not question.is_required and rng.random() < 0.25:
        return None

    answer = Answer(question_id=question.id)
    title = question.title.lower()

    if question.type == "short_text":
        if "company" in title:
            answer.value_text = rng.choice(COMPANIES)
        else:
            answer.value_text = person_name
    elif question.type == "long_text":
        if "dietary" in title:
            answer.value_text = rng.choice(DIETARY_NOTES)
        else:
            answer.value_text = rng.choice(FEEDBACK_COMMENTS)
    elif question.type == "email":
        answer.value_text = f"{person_name.lower()}{rng.randint(1, 99)}@example.com"
    elif question.type == "number":
        if "guests" in title:
            answer.value_number = rng.randint(0, 3)
        else:
            answer.value_number = rng.choice([1, 3, 5, 8, 12, 20, 45])
    elif question.type == "rating":
        # Skewed towards the top of the scale, like real satisfaction scores: each
        # step up the scale is twice as likely as the one below it.
        possible_ratings = list(range(1, question.rating_max + 1))
        weights = [2**rating for rating in possible_ratings]
        answer.value_number = rng.choices(possible_ratings, weights=weights)[0]
    elif question.type == "yes_no":
        answer.value_boolean = rng.random() < 0.75
    elif question.type in ("multiple_choice", "dropdown"):
        how_many = 1
        if question.type == "multiple_choice" and question.allow_multiple:
            how_many = rng.randint(1, 3)
        for choice in rng.sample(question.choices, how_many):
            answer.selected_choices.append(AnswerChoice(choice_id=choice.id))

    return answer


def add_fake_responses(db: Session, form: Form, submitted: int, abandoned: int, rng: random.Random) -> None:
    """
    Add `submitted` finished responses and `abandoned` started-but-unfinished ones,
    spread over the last two weeks.
    """
    now = utc_now()
    published_questions = form.published_snapshot["questions"]
    question_by_id = {question.id: question for question in form.questions}

    for _ in range(submitted):
        started_at = now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        response = Response(
            form_id=form.id,
            token=secrets.token_urlsafe(24),
            started_at=started_at,
            submitted_at=started_at + timedelta(seconds=rng.randint(40, 300)),
        )
        person_name = rng.choice(FIRST_NAMES)

        # Walk the form the way a real respondent would, following logic jumps, so the
        # sample data never contains an answer to a question that was skipped.
        current_index = 0
        while current_index != logic.END_OF_FORM:
            question = question_by_id[published_questions[current_index]["id"]]
            answer = make_fake_answer(question, rng, person_name)

            number = None
            boolean = None
            choice_ids: list[int] = []
            if answer is not None:
                response.answers.append(answer)
                number = answer.value_number
                boolean = answer.value_boolean
                choice_ids = [selected.choice_id for selected in answer.selected_choices]
            current_index = logic.next_question_index(published_questions, current_index, number, boolean, choice_ids)
        db.add(response)

    for _ in range(abandoned):
        started_at = now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23))
        db.add(Response(form_id=form.id, token=secrets.token_urlsafe(24), started_at=started_at))


def seed(db: Session) -> None:
    """Insert all sample data. Assumes the tables exist and are empty."""
    # A fixed seed makes the "random" data the same on every run, so screenshots and
    # the README stay accurate.
    rng = random.Random(42)
    creator = get_or_create_default_creator(db)

    feedback_form = build_feedback_form(creator)
    event_form = build_event_form(creator)
    draft_form = build_draft_form(creator)
    db.add_all([feedback_form, event_form, draft_form])
    # flush() sends the INSERTs so every question and choice gets its id, which the
    # snapshot and the fake answers need. Nothing is final until commit().
    db.flush()

    # One logic jump for the demo: people who are not coming in person skip the two
    # questions about the day itself (favourite session, number of guests).
    joining_in_person = event_form.questions[2]
    company = event_form.questions[5]
    joining_in_person.logic_jumps.append(
        LogicJump(operator="is", compare_boolean=False, target_question_id=company.id)
    )
    db.flush()

    snapshot.publish_form(db, feedback_form)
    snapshot.publish_form(db, event_form)

    add_fake_responses(db, feedback_form, submitted=24, abandoned=7, rng=rng)
    add_fake_responses(db, event_form, submitted=14, abandoned=3, rng=rng)
    db.commit()


def seed_if_empty(db: Session) -> None:
    """Seed only a brand-new database, so real data is never overwritten."""
    form_count = db.scalar(select(func.count(Form.id)))
    if form_count == 0:
        seed(db)


def reset_and_seed() -> None:
    """Drop every table, recreate them, and seed. Destroys all existing data."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_and_seed()
        print("Database reset and seeded.")
    else:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_if_empty(db)
        print("Seeded (only if the database was empty).")
