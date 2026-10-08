"""
services/export.py — turning a form's responses into a downloadable file.

What it does:   builds one table (a heading row plus one row per response) and writes
                it either as CSV text or as an Excel workbook.
Depends on:     models.py, presenters.py, services/snapshot.py, services/text.py,
                openpyxl (Excel files).
Depended on by: routers/responses.py.

Both formats are written from the same table, so they can never disagree. The columns
follow Typeform's export: the response number, one column per question, then the
response type, the two dates and the ending the respondent reached.
"""

import csv
import io

from openpyxl import Workbook

from app import presenters
from app.models import Form, Response
from app.services import snapshot
from app.services.text import strip_formatting

# "2026-10-08 22:07:35", the way Typeform writes dates in its export.
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def build_export_table(form: Form, responses: list[Response]) -> list[list]:
    """
    The whole export as a list of rows; the first row is the column headings.

    Questions come from the published snapshot, because those are the questions the
    respondents answered. A question someone skipped is an empty cell.
    """
    questions = snapshot.snapshot_questions(form)
    ending = strip_formatting(snapshot.snapshot_thank_you_title(form))

    heading = ["#"]
    for question in questions:
        heading.append(strip_formatting(question["title"]))
    heading += ["Response Type", "Start Date (UTC)", "Submit Date (UTC)", "Ending"]

    table = [heading]
    for response in responses:
        presented = presenters.present_response(response, form)
        display_by_question_id = {answer.question_id: answer.display for answer in presented.answers}

        row = [response.id]
        for question in questions:
            row.append(display_by_question_id.get(question["id"], ""))
        row += [
            # Only submitted responses are exported, so every row is a completed one.
            "completed",
            response.started_at.strftime(DATE_FORMAT),
            response.submitted_at.strftime(DATE_FORMAT),
            ending,
        ]
        table.append(row)

    return table


def table_to_csv(table: list[list]) -> str:
    """
    Why the `csv` module instead of joining strings with commas: answers can contain
    commas, quotes and line breaks, and the module escapes them correctly.
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in table:
        writer.writerow(row)
    return buffer.getvalue()


def table_to_xlsx(table: list[list]) -> bytes:
    """
    An Excel workbook with one sheet. openpyxl writes the file into memory, so nothing
    is left on the server's disk.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Responses"
    for row in table:
        sheet.append(row)

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
