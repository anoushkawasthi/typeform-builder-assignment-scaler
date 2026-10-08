/**
 * logic.ts — logic jumps in the browser: which question comes next.
 *
 * What it does:   applies a question's rules to its answer to find the next question,
 *                 and lists the questions a respondent has actually been shown.
 * Depends on:     lib/types.ts.
 * Depended on by: components/respondent/form-flow.tsx, lib/validation.ts,
 *                 components/builder/logic-editor.tsx (operator lists).
 *
 * This mirrors backend/app/services/logic.py rule for rule. The server re-walks the
 * same path when a response is submitted, so the two must agree.
 */

import type { AnswerMap, AnswerValue, LogicJump, LogicOperator, QuestionType, RenderableQuestion } from "./types";

/** Which comparisons each question type supports. Same table as the backend's. */
export const OPERATORS_BY_QUESTION_TYPE: Record<QuestionType, LogicOperator[]> = {
  short_text: ["always"],
  long_text: ["always"],
  email: ["always"],
  multiple_choice: ["always", "is", "is_not"],
  dropdown: ["always", "is", "is_not"],
  yes_no: ["always", "is"],
  number: ["always", "is", "less_than", "greater_than"],
  rating: ["always", "is", "less_than", "greater_than"],
};

export const OPERATOR_LABELS: Record<LogicOperator, string> = {
  always: "Always",
  is: "is",
  is_not: "is not",
  less_than: "is less than",
  greater_than: "is greater than",
};

/** The answer as a number, for number and rating questions; null if there is none. */
function answerAsNumber(question: RenderableQuestion, value: AnswerValue | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  if (question.type === "rating") {
    return value.number ?? null;
  }
  if (question.type === "number") {
    // Number answers are held as text while being typed.
    const text = (value.text ?? "").trim();
    if (text === "" || !Number.isFinite(Number(text))) {
      return null;
    }
    return Number(text);
  }
  return null;
}

/** Does one rule apply to one answer? An unanswered question matches only "always". */
export function ruleMatches(rule: LogicJump, question: RenderableQuestion, value: AnswerValue | undefined): boolean {
  if (rule.operator === "always") {
    return true;
  }

  if (rule.compare_choice_id !== null) {
    const choiceIds = value?.choice_ids ?? [];
    if (choiceIds.length === 0) {
      return false;
    }
    const isPicked = choiceIds.includes(rule.compare_choice_id);
    if (rule.operator === "is") {
      return isPicked;
    }
    if (rule.operator === "is_not") {
      return !isPicked;
    }
    return false;
  }

  if (rule.compare_boolean !== null) {
    const answer = value?.boolean;
    if (answer === undefined || answer === null) {
      return false;
    }
    return rule.operator === "is" && answer === rule.compare_boolean;
  }

  if (rule.compare_number !== null) {
    const answer = answerAsNumber(question, value);
    if (answer === null) {
      return false;
    }
    if (rule.operator === "is") {
      return answer === rule.compare_number;
    }
    if (rule.operator === "less_than") {
      return answer < rule.compare_number;
    }
    if (rule.operator === "greater_than") {
      return answer > rule.compare_number;
    }
  }

  return false;
}

/**
 * The index of the question to show after `currentIndex`. Returns `questions.length`
 * when the form should end.
 *
 * The first matching rule wins. Rules may only jump forward: a target that is not later
 * in the form is ignored, so a loop is impossible.
 */
export function nextQuestionIndex(
  questions: RenderableQuestion[],
  currentIndex: number,
  value: AnswerValue | undefined,
): number {
  const question = questions[currentIndex];

  for (const rule of question.logic_jumps) {
    if (!ruleMatches(rule, question, value)) {
      continue;
    }
    if (rule.target_question_id === null) {
      return questions.length;
    }
    const targetIndex = questions.findIndex((candidate) => candidate.id === rule.target_question_id);
    if (targetIndex > currentIndex) {
      return targetIndex;
    }
    // Target missing or not ahead of us: ignore this rule and try the next one.
  }

  return currentIndex + 1;
}

/**
 * The indexes of the questions on the respondent's path, from the first question up to
 * (not including) `stopBeforeIndex`, given the answers so far.
 *
 * Used for two things: the "previous" button (go back along the path, not to a skipped
 * question), and submitting (send answers only for questions that were shown).
 */
export function visitedIndexes(
  questions: RenderableQuestion[],
  answers: AnswerMap,
  stopBeforeIndex: number = questions.length,
): number[] {
  const visited: number[] = [];
  let index = 0;
  while (index < questions.length && index < stopBeforeIndex) {
    visited.push(index);
    index = nextQuestionIndex(questions, index, answers[questions[index].id]);
  }
  return visited;
}
