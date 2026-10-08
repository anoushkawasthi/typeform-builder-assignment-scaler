# Typeform Replica

A working clone of Typeform's core workflow: build a form in a three-panel builder,
publish it to a shareable link, collect answers one question at a time, and review the
results.

- **Live demo:** https://typeform-replica.ikyano.tech
- **API docs (auto-generated):** https://forms-api.ikyano.tech/docs
- **Sample public forms:** `/to/demoFdbk` (customer feedback) and `/to/demoEvnt` (event RSVP)

The demo opens straight into the workspace of a default creator; there is no login
(the brief allows this). Two published forms with responses and one draft are seeded.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4 |
| Frontend libraries | TanStack Query (API data), Motion (question transitions), dnd-kit (drag and drop), Radix Dialog and Dropdown Menu (accessible, unstyled primitives), Sonner (toasts), Lucide (icons) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | SQLite |
| Tests | pytest (34 tests: validation rules, logic jumps and API routes) |
| Hosting | Frontend on Vercel; backend as a systemd service on a VPS behind a Cloudflare Tunnel, SQLite on the server's disk (a Dockerfile and Compose file are included as an alternative) |

## Features

**Form builder** — a form title and an ordered list of questions; add, edit, drag to
reorder and delete; eight question types (short text, long text, multiple choice,
dropdown, email, number, yes/no, rating); required toggle and description per question;
titles, descriptions and choices edited in place on a live canvas; a full Preview that
saves nothing; everything autosaves.

**Form management** — list of forms with status, question count and response count;
create, rename, duplicate, delete; publish and unpublish with a shareable link.

**Respondent flow** — one question per screen with a slide-and-fade transition; keyboard
navigation (Enter, arrow keys, A/B/C for choices, Y/N, number keys for ratings); progress
bar; validation in the browser and again on the server; thank-you screen; no login.

**Results** — starts, submissions and completion rate; a summary card per question
(counts per choice, yes/no split, rating spread, averages, latest text answers); a table
of responses; a single response in full; CSV export.

**Logic jumps** — per-question rules such as "if the answer is No, go to question 6" or
"if the rating is less than 3, end the form"; edited in the builder's Logic panel, shown
together on the Workflow tab, followed in the form and re-checked on the server.

**Welcome screen** — an optional first screen with a title, text and a Start button.

**Text formatting** — select text in a title, description or choice in the builder to
make it bold or italic; stored as plain-text markers (`**bold**`, `*italic*`), never HTML.

**Also** — themes (presets, custom colours, font) and an editable thank-you screen;
toasts, modals and confirmation before anything destructive.

**Placeholders ("Coming soon")** — advanced branching (several conditions,
calculations), integrations (Connect tab), team collaboration (Invite), payment and
file-upload question types.

## Running it locally

Requirements: Python 3.12+ and Node.js 20+.

```bash
# 1. Backend  ->  http://localhost:8000  (API docs at /docs)
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 2. Frontend ->  http://localhost:3000   (in a second terminal)
cd frontend
cp .env.example .env.local           # points the frontend at http://localhost:8000
npm install
npm run dev
```

The database file (`backend/data/app.db`) is created and seeded on first start.
To wipe it and seed again: `python -m app.seed --reset` (from `backend/`).

Run the tests: `cd backend && pytest`.

## Architecture

```
Browser ──► Next.js frontend (Vercel) ──JSON over HTTPS──► FastAPI backend ──► SQLite file
```

The frontend never touches the database; it only calls the API. All rules (validation,
publishing, statistics) live in the backend. The frontend repeats validation only to give
instant feedback.

```
backend/app/
  main.py            app, CORS, startup (create tables, seed), router registration
  database.py        engine, session, get_db dependency
  models.py          the eight tables
  schemas.py         request and response shapes (Pydantic)
  auth.py            get_current_creator: the single place that decides who is calling
  presenters.py      database rows -> response shapes
  routers/           forms.py, questions.py, logic_jumps.py, responses.py, public.py
  services/          snapshot.py (draft vs published), validation.py, logic.py, stats.py
  seed.py            sample data
backend/tests/       test_validation.py, test_api.py

frontend/src/
  app/               routes only; each page renders one screen component
  components/ui/         shared admin controls (button, modal, menu, toggle, ...)
  components/forms-list/ the home screen
  components/builder/    question list, canvas, settings, publish, design, preview, share
  components/respondent/ the one-question-at-a-time flow
  components/results/    summary and responses
  question-types/        one answer control per kind of question
  lib/                   api.ts (every HTTP call), types.ts, validation.ts, logic.ts, question-types.ts
```

Two design points worth knowing:

1. **One set of question components.** The builder canvas, the Preview and the public
   form all draw a question through `src/question-types` and
   `components/respondent/question-screen.tsx`. The preview cannot drift from the real
   form because it is the real form.
2. **Draft and published copies.** Like Typeform, edits in the builder are a draft and do
   not reach respondents until Publish is pressed again. Publishing stores a snapshot of
   the form; the public link reads only that snapshot.

## Database schema

```
creators ──< forms ──< questions ──< question_choices
               │           ├──< logic_jumps (rule on a question; points at a target question)
               │           │                │
               │           └──< answers >───┼── (question an answer belongs to)
               └──< responses ──< answers ──< answer_choices >── question_choices
```

| Table | Columns | Purpose |
|---|---|---|
| `creators` | id, name, email (unique), created_at | Who owns forms. One seeded row. |
| `forms` | id, creator_id → creators, public_id (unique), title, status, published_snapshot (JSON), published_at, theme_background_color, theme_question_color, theme_answer_color, theme_button_color, theme_button_text_color, theme_font, welcome_enabled, welcome_title, welcome_text, welcome_button_text, thank_you_title, thank_you_text, created_at, updated_at | A form. Its `questions` rows are the draft; `published_snapshot` is the live copy. |
| `questions` | id, form_id → forms, type, title, description, is_required, position, allow_multiple, rating_max, deleted_at | One question; `position` is its order. |
| `question_choices` | id, question_id → questions, label, position, deleted_at | Options of multiple-choice and dropdown questions. |
| `logic_jumps` | id, question_id → questions, position, operator, compare_choice_id → question_choices, compare_number, compare_boolean, target_question_id → questions | One rule: "if the answer `operator` `compare value`, go to `target`". An empty target means the end of the form. |
| `responses` | id, form_id → forms, token (unique), started_at, submitted_at | One person's pass through a form. Created on start; `submitted_at` empty means abandoned. |
| `answers` | id, response_id → responses, question_id → questions, value_text, value_number, value_boolean; unique (response_id, question_id) | One answered question. |
| `answer_choices` | answer_id → answers, choice_id → question_choices (composite primary key) | Which choices were picked. |

Why it is shaped this way:

- **One row per answer**, not a JSON blob per response, so "how many people chose X" is a
  SQL `GROUP BY` and the database guarantees every answer points at a real question.
- **Typed value columns** (`value_text`, `value_number`, `value_boolean`) so averages work
  and a "No" is a real `false`.
- **A join table for picked choices**: one answer can have many choices and one choice
  appears in many answers.
- **Logic rules are rows, with typed compare values and real foreign keys**, so deleting
  a question or choice removes the rules that mention it. Jumps may only go forward,
  which makes loops impossible.
- **`public_id` and `token` are random strings**, so public links and in-progress
  responses cannot be guessed by counting.
- **`deleted_at` (soft delete)** on questions and choices: something deleted from the
  draft may still be live for respondents, so its row is kept until the next publish.
- **`published_snapshot` is the one JSON column**, and deliberately so: it is a frozen
  copy that is only ever read whole.
- All foreign keys cascade on delete, and SQLite's foreign-key enforcement is switched on
  for every connection.

## API overview

Creator routes:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/forms` | List forms |
| POST | `/api/forms` | Create a form |
| GET | `/api/forms/{id}` | Full form for the builder |
| PATCH | `/api/forms/{id}` | Rename; theme; thank-you text |
| DELETE | `/api/forms/{id}` | Delete a form and everything under it |
| POST | `/api/forms/{id}/duplicate` | Copy a form |
| POST | `/api/forms/{id}/publish` | Publish, or publish edits |
| POST | `/api/forms/{id}/unpublish` | Close the public link |
| POST | `/api/forms/{id}/questions` | Add a question |
| PUT | `/api/forms/{id}/questions/order` | Save a new order |
| PATCH | `/api/questions/{id}` | Edit a question |
| POST | `/api/questions/{id}/duplicate` | Copy a question, placed right after it |
| DELETE | `/api/questions/{id}` | Delete a question |
| POST | `/api/questions/{id}/choices` | Add a choice |
| PATCH | `/api/choices/{id}` | Rename a choice |
| DELETE | `/api/choices/{id}` | Remove a choice |
| POST | `/api/questions/{id}/logic-jumps` | Add a logic jump |
| PUT | `/api/logic-jumps/{id}` | Replace a logic jump |
| DELETE | `/api/logic-jumps/{id}` | Remove a logic jump |
| GET | `/api/forms/{id}/responses` | Responses table |
| GET | `/api/forms/{id}/responses.csv` | The same as a CSV download |
| GET | `/api/forms/{id}/summary` | Per-question statistics and completion rate |
| GET | `/api/responses/{id}` | One response in full |

Public routes (no login):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/forms/{public_id}` | The published form |
| POST | `/api/public/forms/{public_id}/responses` | Start a response; returns a token |
| POST | `/api/public/responses/{token}/submit` | Validate and store the answers |

Conventions: every builder edit returns the whole updated form; validation failures
return 422 with `{"errors": [{"question_id", "message"}]}`; 404 is used for missing,
unpublished and other creators' resources; 409 for a double submit or changing the type
of a question that already has answers.

## Assumptions

- **No creator login.** One default creator is assumed, as the brief permits. The
  `creators` table and a single `get_current_creator` function exist so real login would
  be a contained change.
- **"Live preview"** is read as both the in-builder canvas and a separate full Preview.
- **Publishing follows Typeform:** edits are a draft until published again.
- **Deleting an answered question** keeps its answers until the next publish, which
  removes them after a confirmation that states how many will be lost.
- **A question's type is locked once it has answers**, because answers are stored by type.
- **Multiple choice** is single-select by default with a "Multiple selection" toggle;
  dropdown is always single-select.
- **Number questions** accept any finite number (Typeform's accept only whole numbers).
- **Rating** is stars, 3 to 10, default 5.
- **Logic jumps** have one condition each, are checked top to bottom (first match
  wins), and can only jump forward or to the end. A question skipped by a jump is not
  required and any answer sent for it is discarded.
- **Mobile:** the public form is responsive; the builder is designed for desktop widths.
- **Branding:** the layout and interaction patterns follow Typeform, but the name and
  mark are our own; no Typeform logos or assets are used.

## Deploying

**Backend.** It needs Python 3.12 and a disk that persists. The live demo runs it as a
systemd user service:

```bash
git clone https://github.com/anoushkawasthi/typeform-builder-assignment-scaler.git
cd typeform-builder-assignment-scaler/backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

DATABASE_URL=sqlite:////absolute/path/to/app.db \
ALLOWED_ORIGINS=https://typeform-replica.ikyano.tech \
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8017
```

It listens on localhost only; a Cloudflare Tunnel maps `forms-api.ikyano.tech` to it.
With Docker instead: `cp .env.example .env && docker compose up -d --build` (the SQLite
file then lives in the `sqlite-data` volume).

**Frontend (Vercel).** Import the repository, set the root directory to `frontend`, and
set `NEXT_PUBLIC_API_URL` to the backend's public address.
