"""
routers/logic_jumps.py — creator-side routes for logic jumps.

What it does:   add, replace and delete the rules of a question ("if the answer is X,
                go to question Y").
Depends on:     auth.py, database.py, models.py, schemas.py, presenters.py,
                services/logic.py, services/snapshot.py, routers/questions.py.
Depended on by: main.py (registers the router).

Like the question routes, each of these returns the whole updated form.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import presenters, schemas
from app.auth import get_current_creator
from app.database import get_db
from app.models import Creator, Form, LogicJump, Question
from app.routers.questions import get_question_or_404
from app.services import logic, snapshot

router = APIRouter(prefix="/api", tags=["logic jumps"])


def get_logic_jump_or_404(db: Session, logic_jump_id: int, creator: Creator) -> LogicJump:
    """Load a rule only if its form belongs to this creator."""
    jump = db.scalar(
        select(LogicJump)
        .join(Question, LogicJump.question_id == Question.id)
        .join(Form, Question.form_id == Form.id)
        .where(LogicJump.id == logic_jump_id, Form.creator_id == creator.id, Question.deleted_at.is_(None))
    )
    if jump is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logic jump not found")
    return jump


def apply_rule(question: Question, jump: LogicJump, body: schemas.LogicJumpIn) -> None:
    """
    Check a rule against its question and copy it onto the row. Raises 400 with a
    readable message if the rule does not make sense.
    """
    form = question.form
    active_questions = snapshot.active_questions(form)

    # Keep only the compare value that fits the question's type; ignore the others.
    compare_choice_id = None
    compare_number = None
    compare_boolean = None
    if body.operator != "always":
        if question.type in ("multiple_choice", "dropdown"):
            compare_choice_id = body.compare_choice_id
        elif question.type == "yes_no":
            compare_boolean = body.compare_boolean
        elif question.type in ("number", "rating"):
            compare_number = body.compare_number

    error_message = logic.check_rule(
        question.type,
        body.operator,
        has_choice=compare_choice_id is not None,
        has_number=compare_number is not None,
        has_boolean=compare_boolean is not None,
    )
    if error_message is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_message)

    if compare_choice_id is not None:
        own_choice_ids = [choice.id for choice in snapshot.active_choices(question)]
        if compare_choice_id not in own_choice_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That choice does not belong to this question",
            )

    if body.target_question_id is not None:
        target = None
        for candidate in active_questions:
            if candidate.id == body.target_question_id:
                target = candidate
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The question to jump to is not part of this form",
            )
        # Forward only. A jump backwards could send a respondent round in circles.
        if target.position <= question.position:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A jump can only go to a later question",
            )

    jump.operator = body.operator
    jump.compare_choice_id = compare_choice_id
    jump.compare_number = compare_number
    jump.compare_boolean = compare_boolean
    jump.target_question_id = body.target_question_id


@router.post(
    "/questions/{question_id}/logic-jumps",
    response_model=schemas.FormDetailOut,
    status_code=status.HTTP_201_CREATED,
)
def create_logic_jump(
    question_id: int,
    body: schemas.LogicJumpIn,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """Add a rule to the end of a question's list."""
    question = get_question_or_404(db, question_id, creator)
    form = question.form

    jump = LogicJump(position=len(question.logic_jumps))
    apply_rule(question, jump, body)
    question.logic_jumps.append(jump)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.put("/logic-jumps/{logic_jump_id}", response_model=schemas.FormDetailOut)
def replace_logic_jump(
    logic_jump_id: int,
    body: schemas.LogicJumpIn,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """Replace a rule. PUT, not PATCH, because the body is always the complete rule."""
    jump = get_logic_jump_or_404(db, logic_jump_id, creator)
    question = jump.question
    form = question.form

    apply_rule(question, jump, body)

    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)


@router.delete("/logic-jumps/{logic_jump_id}", response_model=schemas.FormDetailOut)
def delete_logic_jump(
    logic_jump_id: int,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    jump = get_logic_jump_or_404(db, logic_jump_id, creator)
    form = jump.question.form

    db.delete(jump)
    snapshot.touch_form(form)
    db.commit()
    db.refresh(form)
    return presenters.present_form_detail(db, form)
