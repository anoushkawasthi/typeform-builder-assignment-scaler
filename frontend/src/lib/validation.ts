/**
 * validation.ts — checking answers in the browser, and packing them for the API.
 *
 * What it does:   decides whether an answer is empty or invalid, and converts the
 *                 answers held in memory into the body of the submit request.
 * Depends on:     lib/types.ts, lib/logic.ts.
 * Depended on by: components/respondent/form-flow.tsx.
 *
 * The same rules exist on the server (backend/app/services/validation.py), which is the
 * one that actually protects the data. This copy only exists so the respondent gets
 * feedback instantly instead of after submitting. The messages are kept identical.
 */

import { visitedIndexes } from "./logic";
import type { AnswerMap, AnswerPayload, AnswerValue, RenderableQuestion } from "./types";

export const MESSAGE_REQUIRED = "Please fill this in";
export const MESSAGE_REQUIRED_CHOICE = "Oops! Please make a selection";
export const MESSAGE_INVALID_EMAIL = "Hmm... that email doesn't look right";
export const MESSAGE_INVALID_NUMBER = "Numbers only please";

// Deliberately simple: something@something.something with no spaces. The server runs a
// stricter check; this only catches obvious slips.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the respondent has not given an answer to this question. */
export function isAnswerEmpty(question: RenderableQuestion, value: AnswerValue | undefined): boolean {
  if (value === undefined) {
    return true;
  }

  switch (question.type) {
    case "short_text":
    case "long_text":
    case "email":
    case "number":
      return (value.text ?? "").trim() === "";
    case "rating":
      return value.number === undefined || value.number === null;
    case "yes_no":
      // `false` ("No") is a real answer, so we must not use a plain falsy check here.
      return value.boolean === undefined || value.boolean === null;
    case "multiple_choice":
    case "dropdown":
      return (value.choice_ids ?? []).length === 0;
  }
}

/** Returns an error message, or null when the answer is acceptable. */
export function validateAnswer(question: RenderableQuestion, value: AnswerValue | undefined): string | null {
  if (isAnswerEmpty(question, value)) {
    if (!question.is_required) {
      return null;
    }
    const isPickType = ["multiple_choice", "dropdown", "yes_no", "rating"].includes(question.type);
    return isPickType ? MESSAGE_REQUIRED_CHOICE : MESSAGE_REQUIRED;
  }

  const text = (value?.text ?? "").trim();

  if (question.type === "email" && !EMAIL_PATTERN.test(text)) {
    return MESSAGE_INVALID_EMAIL;
  }

  if (question.type === "number" && !Number.isFinite(Number(text))) {
    return MESSAGE_INVALID_NUMBER;
  }

  return null;
}

/**
 * Build the list of answers to send. Unanswered questions are left out entirely, which
 * is how the server knows an optional question was skipped.
 *
 * Only questions on the respondent's path are included. If they answered a question,
 * went back, and changed an earlier answer so that a logic jump now skips it, that old
 * answer is not sent.
 */
export function toAnswerPayloads(questions: RenderableQuestion[], answers: AnswerMap): AnswerPayload[] {
  const payloads: AnswerPayload[] = [];

  for (const index of visitedIndexes(questions, answers)) {
    const question = questions[index];
    const value = answers[question.id];
    if (isAnswerEmpty(question, value) || value === undefined) {
      continue;
    }

    const payload: AnswerPayload = { question_id: question.id };

    switch (question.type) {
      case "short_text":
      case "long_text":
      case "email":
        payload.text = (value.text ?? "").trim();
        break;
      case "number":
        // Held as text while typing (so "1." or "-" can exist mid-way); a number here.
        payload.number = Number((value.text ?? "").trim());
        break;
      case "rating":
        payload.number = value.number ?? undefined;
        break;
      case "yes_no":
        payload.boolean = value.boolean ?? undefined;
        break;
      case "multiple_choice":
      case "dropdown":
        payload.choice_ids = value.choice_ids ?? [];
        break;
    }

    payloads.push(payload);
  }

  return payloads;
}
