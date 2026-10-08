"""
test_api.py — the main routes, tested end to end through HTTP against a test database.
"""


def test_create_rename_duplicate_delete_form(client):
    form = client.post("/api/forms", json={"title": "Survey"}).json()
    assert form["status"] == "draft"
    assert form["questions"] == []

    renamed = client.patch(f"/api/forms/{form['id']}", json={"title": "Better survey"}).json()
    assert renamed["title"] == "Better survey"

    copy = client.post(f"/api/forms/{form['id']}/duplicate").json()
    assert copy["title"] == "Better survey (copy)"
    assert copy["id"] != form["id"]
    assert copy["public_id"] != form["public_id"]

    assert client.delete(f"/api/forms/{form['id']}").status_code == 204
    assert client.get(f"/api/forms/{form['id']}").status_code == 404
    assert len(client.get("/api/forms").json()) == 1


def test_questions_can_be_inserted_and_reordered(client):
    form = client.post("/api/forms", json={"title": "Order"}).json()
    client.post(f"/api/forms/{form['id']}/questions", json={"type": "short_text"})
    client.post(f"/api/forms/{form['id']}/questions", json={"type": "number"})
    form = client.post(f"/api/forms/{form['id']}/questions", json={"type": "email", "position": 0}).json()
    assert [question["type"] for question in form["questions"]] == ["email", "short_text", "number"]

    ids = [question["id"] for question in form["questions"]]
    new_order = [ids[2], ids[0], ids[1]]
    form = client.put(f"/api/forms/{form['id']}/questions/order", json={"question_ids": new_order}).json()
    assert [question["id"] for question in form["questions"]] == new_order
    assert [question["position"] for question in form["questions"]] == [0, 1, 2]

    # An incomplete list must be refused, not silently applied.
    bad = client.put(f"/api/forms/{form['id']}/questions/order", json={"question_ids": ids[:2]})
    assert bad.status_code == 400


def test_empty_form_cannot_be_published(client):
    form = client.post("/api/forms", json={"title": "Empty"}).json()
    assert client.post(f"/api/forms/{form['id']}/publish").status_code == 400


def test_draft_edits_do_not_reach_respondents_until_republished(client, published_form):
    form_id = published_form["form_id"]
    first_question = published_form["questions"][0]

    edited = client.patch(f"/api/questions/{first_question['id']}", json={"title": "New title"}).json()
    assert edited["has_unpublished_changes"] is True

    still_live = client.get(f"/api/public/forms/{published_form['public_id']}").json()
    assert still_live["questions"][0]["title"] == first_question["title"]

    republished = client.post(f"/api/forms/{form_id}/publish").json()
    assert republished["has_unpublished_changes"] is False
    now_live = client.get(f"/api/public/forms/{published_form['public_id']}").json()
    assert now_live["questions"][0]["title"] == "New title"


def test_unpublished_form_is_not_reachable(client, published_form):
    client.post(f"/api/forms/{published_form['form_id']}/unpublish")
    assert client.get(f"/api/public/forms/{published_form['public_id']}").status_code == 404


def submit(client, public_form, answers):
    token = client.post(f"/api/public/forms/{public_form['public_id']}/responses").json()["token"]
    return token, client.post(f"/api/public/responses/{token}/submit", json={"answers": answers})


def valid_answers(public_form):
    questions = public_form["questions_by_type"]
    return [
        {"question_id": questions["short_text"]["id"], "text": "Ann"},
        {"question_id": questions["email"]["id"], "text": "ann@example.com"},
        {"question_id": questions["multiple_choice"]["id"], "choice_ids": [questions["multiple_choice"]["choices"][1]["id"]]},
        {"question_id": questions["yes_no"]["id"], "boolean": False},
        {"question_id": questions["rating"]["id"], "number": 4},
    ]


def test_invalid_submission_is_rejected_and_nothing_is_stored(client, published_form):
    questions = published_form["questions_by_type"]
    _, response = submit(client, published_form, [{"question_id": questions["email"]["id"], "text": "nope"}])
    assert response.status_code == 422
    failed_question_ids = {error["question_id"] for error in response.json()["errors"]}
    assert failed_question_ids == {questions["short_text"]["id"], questions["email"]["id"]}

    table = client.get(f"/api/forms/{published_form['form_id']}/responses").json()
    assert table["responses"] == []


def test_valid_submission_appears_in_results(client, published_form):
    form_id = published_form["form_id"]
    token, response = submit(client, published_form, valid_answers(published_form))
    assert response.status_code == 201

    # Submitting the same response twice is refused.
    again = client.post(f"/api/public/responses/{token}/submit", json={"answers": valid_answers(published_form)})
    assert again.status_code == 409

    table = client.get(f"/api/forms/{form_id}/responses").json()
    assert len(table["responses"]) == 1
    displays = {answer["question_id"]: answer["display"] for answer in table["responses"][0]["answers"]}
    questions = published_form["questions_by_type"]
    assert displays[questions["short_text"]["id"]] == "Ann"
    assert displays[questions["multiple_choice"]["id"]] == "Green"
    assert displays[questions["yes_no"]["id"]] == "No"
    assert displays[questions["rating"]["id"]] == "4"

    detail = client.get(f"/api/responses/{table['responses'][0]['id']}")
    assert detail.status_code == 200

    assert client.get("/api/forms").json()[0]["response_count"] == 1


def test_summary_counts_choices_and_completion_rate(client, published_form):
    submit(client, published_form, valid_answers(published_form))
    submit(client, published_form, valid_answers(published_form))
    # A third person starts but never submits.
    client.post(f"/api/public/forms/{published_form['public_id']}/responses")

    summary = client.get(f"/api/forms/{published_form['form_id']}/summary").json()
    assert summary["started_count"] == 3
    assert summary["submitted_count"] == 2
    assert summary["completion_rate"] == 66.7

    by_type = {question["type"]: question for question in summary["questions"]}
    assert by_type["multiple_choice"]["buckets"] == [
        {"label": "Red", "count": 0},
        {"label": "Green", "count": 2},
        {"label": "Blue", "count": 0},
    ]
    assert by_type["yes_no"]["buckets"] == [{"label": "Yes", "count": 0}, {"label": "No", "count": 2}]
    assert by_type["rating"]["average"] == 4.0
    assert by_type["short_text"]["recent_texts"] == ["Ann", "Ann"]


def test_deleting_an_answered_question_removes_its_answers_only_on_publish(client, published_form):
    form_id = published_form["form_id"]
    rating = published_form["questions_by_type"]["rating"]
    submit(client, published_form, valid_answers(published_form))

    draft = client.delete(f"/api/questions/{rating['id']}").json()
    assert rating["id"] not in [question["id"] for question in draft["questions"]]
    assert draft["answers_lost_on_publish"] == 1

    # Still live for respondents, and the stored answer is still there.
    table = client.get(f"/api/forms/{form_id}/responses").json()
    assert rating["id"] in [answer["question_id"] for answer in table["responses"][0]["answers"]]

    client.post(f"/api/forms/{form_id}/publish")
    table = client.get(f"/api/forms/{form_id}/responses").json()
    assert rating["id"] not in [answer["question_id"] for answer in table["responses"][0]["answers"]]
    assert rating["id"] not in [question["id"] for question in table["questions"]]


def test_type_of_an_answered_question_is_locked(client, published_form):
    short_text = published_form["questions_by_type"]["short_text"]
    submit(client, published_form, valid_answers(published_form))
    response = client.patch(f"/api/questions/{short_text['id']}", json={"type": "long_text"})
    assert response.status_code == 409
