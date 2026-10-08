"use client";

/**
 * logic-editor.tsx — the Logic section of the builder's settings panel.
 *
 * What it does:   lists the selected question's logic jumps and lets the creator add,
 *                 change and remove them. Each rule reads as a sentence:
 *                 "If answer [is] [Yes]  →  go to [5. Which company...]".
 * Depends on:     lib/logic.ts (which operators each type allows), lib/types.ts.
 * Depended on by: question-settings.tsx.
 *
 * Every change sends the complete rule to the server (a PUT), which checks it and
 * returns the form. There is no separate "save" step.
 */

import { ArrowRight, Plus, X } from "lucide-react";

import { OPERATORS_BY_QUESTION_TYPE, OPERATOR_LABELS } from "@/lib/logic";
import type { LogicJump, LogicJumpInput, LogicOperator, Question } from "@/lib/types";

interface LogicEditorProps {
  question: Question;
  /** Every question of the form, in order. Used for the "go to" list. */
  allQuestions: Question[];
  onAdd: (rule: LogicJumpInput) => void;
  onReplace: (logicJumpId: number, rule: LogicJumpInput) => void;
  onDelete: (logicJumpId: number) => void;
}

// What the "go to" select uses for "End of form". Real question ids are positive.
const END_OF_FORM_VALUE = "end";

const SELECT_CLASSES =
  "h-8 min-w-0 rounded-lg border border-admin-border bg-white px-2 text-[13px] text-admin-text outline-none focus:border-admin-text";

/** A sensible starting rule for a question of this type. */
function defaultRule(question: Question, targetQuestionId: number | null): LogicJumpInput {
  const rule: LogicJumpInput = {
    operator: "always",
    compare_choice_id: null,
    compare_number: null,
    compare_boolean: null,
    target_question_id: targetQuestionId,
  };

  if ((question.type === "multiple_choice" || question.type === "dropdown") && question.choices.length > 0) {
    rule.operator = "is";
    rule.compare_choice_id = question.choices[0].id;
  } else if (question.type === "yes_no") {
    rule.operator = "is";
    rule.compare_boolean = true;
  } else if (question.type === "number" || question.type === "rating") {
    rule.operator = "is";
    rule.compare_number = 1;
  }
  return rule;
}

/** Copy the editable fields of a saved rule, dropping its id. */
function toInput(rule: LogicJump): LogicJumpInput {
  return {
    operator: rule.operator,
    compare_choice_id: rule.compare_choice_id,
    compare_number: rule.compare_number,
    compare_boolean: rule.compare_boolean,
    target_question_id: rule.target_question_id,
  };
}

export function LogicEditor({ question, allQuestions, onAdd, onReplace, onDelete }: LogicEditorProps) {
  const questionIndex = allQuestions.findIndex((candidate) => candidate.id === question.id);
  // A jump may only go forward, so only later questions are offered.
  const laterQuestions = allQuestions.slice(questionIndex + 1);
  const allowedOperators = OPERATORS_BY_QUESTION_TYPE[question.type];

  function handleAdd() {
    // Default to skipping one question; if there is nothing to skip to, end the form.
    const target = laterQuestions.length >= 2 ? laterQuestions[1].id : null;
    onAdd(defaultRule(question, target));
  }

  /** Change the operator, filling in or clearing the compare value to match. */
  function withOperator(rule: LogicJump, operator: LogicOperator): LogicJumpInput {
    if (operator === "always") {
      return { ...toInput(rule), operator, compare_choice_id: null, compare_number: null, compare_boolean: null };
    }
    // Coming from "always" there is no compare value yet, so borrow the default one.
    const defaults = defaultRule(question, rule.target_question_id);
    return {
      operator,
      compare_choice_id: rule.compare_choice_id ?? defaults.compare_choice_id,
      compare_number: rule.compare_number ?? defaults.compare_number,
      compare_boolean: rule.compare_boolean ?? defaults.compare_boolean,
      target_question_id: rule.target_question_id,
    };
  }

  return (
    <section className="rounded-xl bg-admin-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-admin-text">Logic</h2>
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add a logic jump"
          title="Add a logic jump"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-white/80 text-admin-muted hover:bg-admin-hover"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* With no rules the panel is just its title and the + button, as in Typeform. */}
      {question.logic_jumps.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {question.logic_jumps.map((rule) => (
            <li key={rule.id} className="rounded-lg border border-admin-border-soft bg-white p-2">
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-[12px] text-admin-muted">
                  {rule.operator === "always" ? "Then" : "If answer"}
                </span>
                <select
                  aria-label="Condition"
                  value={rule.operator}
                  onChange={(event) => onReplace(rule.id, withOperator(rule, event.target.value as LogicOperator))}
                  className={`${SELECT_CLASSES} flex-1`}
                >
                  {allowedOperators.map((operator) => (
                    <option key={operator} value={operator}>
                      {OPERATOR_LABELS[operator]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Remove this rule"
                  onClick={() => onDelete(rule.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-admin-muted hover:bg-admin-hover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {rule.operator !== "always" && (
                <div className="mt-1">
                  <CompareValueField question={question} rule={rule} onChange={(changed) => onReplace(rule.id, changed)} />
                </div>
              )}

              <div className="mt-1 flex items-center gap-1">
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-admin-muted" />
                <select
                  aria-label="Go to"
                  value={rule.target_question_id === null ? END_OF_FORM_VALUE : String(rule.target_question_id)}
                  onChange={(event) =>
                    onReplace(rule.id, {
                      ...toInput(rule),
                      target_question_id: event.target.value === END_OF_FORM_VALUE ? null : Number(event.target.value),
                    })
                  }
                  className={`${SELECT_CLASSES} flex-1`}
                >
                  {laterQuestions.map((later) => (
                    <option key={later.id} value={later.id}>
                      {allQuestions.indexOf(later) + 1}. {later.title === "" ? "..." : later.title}
                    </option>
                  ))}
                  <option value={END_OF_FORM_VALUE}>End of form</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      {question.logic_jumps.length > 1 && (
        <p className="mt-2 text-[12px] leading-4 text-admin-muted">Rules are checked top to bottom; the first match wins.</p>
      )}
    </section>
  );
}

interface CompareValueFieldProps {
  question: Question;
  rule: LogicJump;
  onChange: (rule: LogicJumpInput) => void;
}

/** The value a rule compares the answer with. Its control depends on the question type. */
function CompareValueField({ question, rule, onChange }: CompareValueFieldProps) {
  if (question.type === "multiple_choice" || question.type === "dropdown") {
    return (
      <select
        aria-label="Choice to compare with"
        value={rule.compare_choice_id ?? ""}
        onChange={(event) => onChange({ ...toInput(rule), compare_choice_id: Number(event.target.value) })}
        className={`${SELECT_CLASSES} w-full`}
      >
        {question.choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label === "" ? "Choice" : choice.label}
          </option>
        ))}
      </select>
    );
  }

  if (question.type === "yes_no") {
    return (
      <select
        aria-label="Answer to compare with"
        value={rule.compare_boolean === false ? "no" : "yes"}
        onChange={(event) => onChange({ ...toInput(rule), compare_boolean: event.target.value === "yes" })}
        className={`${SELECT_CLASSES} w-full`}
      >
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }

  // Number and rating. `key` restarts the box when the saved number changes; saving on
  // blur (not on every keystroke) avoids sending "1", "12", "120" as three rules.
  return (
    <input
      key={rule.compare_number}
      type="number"
      aria-label="Number to compare with"
      defaultValue={rule.compare_number ?? 0}
      onBlur={(event) => {
        const number = Number(event.target.value);
        if (Number.isFinite(number) && number !== rule.compare_number) {
          onChange({ ...toInput(rule), compare_number: number });
        }
      }}
      className={`${SELECT_CLASSES} w-full`}
    />
  );
}
