"""
conftest.py — shared test setup.

Every test gets a brand-new, empty, in-memory SQLite database and a client that talks to
the app through it. Nothing touches the real database file.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db, make_engine
from app.main import app


@pytest.fixture
def client():
    engine = make_engine("sqlite://", single_connection=True)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)

    def get_test_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    # Swap the real database dependency for the test one. The app's startup code does
    # not run here, so no sample data is seeded and each test starts from nothing.
    app.dependency_overrides[get_db] = get_test_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def published_form(client):
    """
    A published form with one question of every type. Returns the public form JSON, with
    `questions_by_type` added so tests can look questions up by type.
    """
    form = client.post("/api/forms", json={"title": "Test form"}).json()
    form_id = form["id"]

    for question_type in ["short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating"]:
        form = client.post(f"/api/forms/{form_id}/questions", json={"type": question_type}).json()

    for question in form["questions"]:
        if question["type"] in ("multiple_choice", "dropdown"):
            # A new choice question starts with one empty choice: rename it, add two more.
            first_choice_id = question["choices"][0]["id"]
            client.patch(f"/api/choices/{first_choice_id}", json={"label": "Red"})
            client.post(f"/api/questions/{question['id']}/choices", json={"label": "Green"})
            client.post(f"/api/questions/{question['id']}/choices", json={"label": "Blue"})
        if question["type"] in ("short_text", "email"):
            client.patch(f"/api/questions/{question['id']}", json={"is_required": True})
        if question["type"] == "rating":
            # A new rating question has 3 stars; the tests rate out of 5.
            client.patch(f"/api/questions/{question['id']}", json={"rating_max": 5})

    client.post(f"/api/forms/{form_id}/publish")
    public_form = client.get(f"/api/public/forms/{form['public_id']}").json()
    public_form["form_id"] = form_id
    public_form["questions_by_type"] = {question["type"]: question for question in public_form["questions"]}
    return public_form
