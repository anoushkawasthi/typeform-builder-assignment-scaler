"""
routers/responses.py — creator-side routes for reading results.

What it does:   the responses table for a form, the same table as a CSV or Excel
                download, one response in full, and the per-question summary.
Depends on:     auth.py, database.py, models.py, schemas.py, presenters.py,
                services/snapshot.py, services/stats.py, services/export.py,
                services/text.py, routers/forms.py.
Depended on by: main.py (registers the router).

Results are described using the PUBLISHED questions (the snapshot), because those are
the questions respondents actually answered.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response as HttpResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import presenters, schemas
from app.auth import get_current_creator
from app.database import get_db
from app.models import Answer, Creator, Form, Response
from app.routers.forms import get_form_or_404
from app.services import export, snapshot, stats
from app.services.text import strip_formatting

router = APIRouter(prefix="/api", tags=["responses"])

# The official name browsers and spreadsheet programs expect for an .xlsx file.
XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def download_headers(filename: str) -> dict[str, str]:
    """
    Headers for a file download.

    "attachment" makes the browser save the file instead of displaying it.

    Why "no-store": the hosted API sits behind Cloudflare, which keeps a copy of anything
    whose address ends in .csv or .xlsx for hours unless told not to. Without this an
    export kept returning the same file after new responses had arrived.
    """
    return {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store",
    }


def load_submitted_responses(db: Session, form: Form, response_ids: list[int]) -> list[Response]:
    """
    A form's submitted responses, newest first, with their answers. If `response_ids` is
    not empty, only those responses are returned.

    Why `selectinload`: it fetches all answers (and their selected choices) for the whole
    list of responses in two extra queries, instead of two queries per response.
    """
    query = (
        select(Response)
        .where(Response.form_id == form.id, Response.submitted_at.is_not(None))
        .options(selectinload(Response.answers).selectinload(Answer.selected_choices))
        .order_by(Response.submitted_at.desc())
    )
    if len(response_ids) > 0:
        query = query.where(Response.id.in_(response_ids))
    return list(db.scalars(query).all())


@router.get("/forms/{form_id}/responses", response_model=schemas.ResponsesTableOut)
def list_responses(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """The responses table: the published questions are the columns, each response a row."""
    form = get_form_or_404(db, form_id, creator)
    responses = load_submitted_responses(db, form, [])

    return schemas.ResponsesTableOut(
        questions=snapshot.snapshot_questions(form),
        ending_title=strip_formatting(snapshot.snapshot_thank_you_title(form)),
        responses=[presenters.present_response(response, form) for response in responses],
    )


@router.get("/forms/{form_id}/responses.csv")
def export_responses_csv(
    form_id: int,
    # Written in the address as ?ids=4&ids=9. Left out, every response is exported.
    ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """The responses as a CSV file: one row per submission, one column per question."""
    form = get_form_or_404(db, form_id, creator)
    table = export.build_export_table(form, load_submitted_responses(db, form, ids))

    return HttpResponse(
        content=export.table_to_csv(table),
        media_type="text/csv",
        headers=download_headers(f"responses-{form.public_id}.csv"),
    )


@router.get("/forms/{form_id}/responses.xlsx")
def export_responses_xlsx(
    form_id: int,
    ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """The same table as the CSV export, as an Excel workbook."""
    form = get_form_or_404(db, form_id, creator)
    table = export.build_export_table(form, load_submitted_responses(db, form, ids))

    return HttpResponse(
        content=export.table_to_xlsx(table),
        media_type=XLSX_MEDIA_TYPE,
        headers=download_headers(f"responses-{form.public_id}.xlsx"),
    )


@router.get("/forms/{form_id}/summary", response_model=schemas.FormSummaryOut)
def get_summary(form_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    form = get_form_or_404(db, form_id, creator)
    return stats.summarize_form(db, form)


@router.get("/responses/{response_id}", response_model=schemas.ResponseDetailOut)
def get_response(response_id: int, db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """One submitted response in full. Scoped to the creator through the form."""
    response = db.scalar(
        select(Response)
        .join(Form, Response.form_id == Form.id)
        .where(
            Response.id == response_id,
            Form.creator_id == creator.id,
            Response.submitted_at.is_not(None),
        )
    )
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Response not found")

    form = response.form
    return schemas.ResponseDetailOut(
        form_id=form.id,
        form_title=form.title,
        questions=snapshot.snapshot_questions(form),
        response=presenters.present_response(response, form),
    )
