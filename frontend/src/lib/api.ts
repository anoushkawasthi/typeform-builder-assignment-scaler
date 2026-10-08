/**
 * api.ts — every HTTP call the frontend makes, in one place.
 *
 * What it does:   one small function per backend route, all going through `request`.
 * Depends on:     lib/types.ts and the NEXT_PUBLIC_API_URL environment variable.
 * Depended on by: every screen component (usually through TanStack Query).
 *
 * Why one file: components never build URLs or call fetch themselves, so if a route
 * changes there is exactly one place to update.
 */

import type {
  AnswerError,
  AnswerPayload,
  FormDetail,
  FormListItem,
  FormSummary,
  FormUpdate,
  PublicForm,
  QuestionType,
  QuestionUpdate,
  ResponsesTable,
} from "./types";

// Set in .env.local for development and in Vercel for production.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * An error response from the API. Carries the HTTP status and, for a rejected form
 * submission, the per-question validation errors.
 */
export class ApiError extends Error {
  status: number;
  answerErrors: AnswerError[];

  constructor(status: number, message: string, answerErrors: AnswerError[] = []) {
    super(message);
    this.status = status;
    this.answerErrors = answerErrors;
  }
}

/**
 * Send a request and return the parsed JSON.
 *
 * Why it throws on non-2xx: `fetch` itself only fails on network errors, so without
 * this a 404 or 422 would look like success to the caller.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 204 No Content (used by DELETE) has no body to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let message = "Something went wrong";
    if (data && typeof data.detail === "string") {
      message = data.detail;
    }
    const answerErrors = data && Array.isArray(data.errors) ? data.errors : [];
    throw new ApiError(response.status, message, answerErrors);
  }

  return data as T;
}

// ---- Forms (creator) -------------------------------------------------------------------

export function listForms() {
  return request<FormListItem[]>("GET", "/api/forms");
}

export function createForm(title: string) {
  return request<FormDetail>("POST", "/api/forms", { title });
}

export function getForm(formId: number) {
  return request<FormDetail>("GET", `/api/forms/${formId}`);
}

export function updateForm(formId: number, changes: FormUpdate) {
  return request<FormDetail>("PATCH", `/api/forms/${formId}`, changes);
}

export function deleteForm(formId: number) {
  return request<void>("DELETE", `/api/forms/${formId}`);
}

export function duplicateForm(formId: number) {
  return request<FormDetail>("POST", `/api/forms/${formId}/duplicate`);
}

export function publishForm(formId: number) {
  return request<FormDetail>("POST", `/api/forms/${formId}/publish`);
}

export function unpublishForm(formId: number) {
  return request<FormDetail>("POST", `/api/forms/${formId}/unpublish`);
}

// ---- Questions (creator) ---------------------------------------------------------------
// Each of these returns the whole updated form; see backend/app/routers/questions.py.

export function createQuestion(formId: number, type: QuestionType, position?: number) {
  return request<FormDetail>("POST", `/api/forms/${formId}/questions`, { type, position });
}

export function updateQuestion(questionId: number, changes: QuestionUpdate) {
  return request<FormDetail>("PATCH", `/api/questions/${questionId}`, changes);
}

export function deleteQuestion(questionId: number) {
  return request<FormDetail>("DELETE", `/api/questions/${questionId}`);
}

export function reorderQuestions(formId: number, questionIds: number[]) {
  return request<FormDetail>("PUT", `/api/forms/${formId}/questions/order`, {
    question_ids: questionIds,
  });
}

// ---- Choices (creator) -----------------------------------------------------------------
// One request per choice edited, so two quick edits cannot overwrite each other.

export function createChoice(questionId: number, label: string) {
  return request<FormDetail>("POST", `/api/questions/${questionId}/choices`, { label });
}

export function updateChoice(choiceId: number, label: string) {
  return request<FormDetail>("PATCH", `/api/choices/${choiceId}`, { label });
}

export function deleteChoice(choiceId: number) {
  return request<FormDetail>("DELETE", `/api/choices/${choiceId}`);
}

// ---- Results (creator) -----------------------------------------------------------------

export function getResponses(formId: number) {
  return request<ResponsesTable>("GET", `/api/forms/${formId}/responses`);
}

/** Address of the CSV download. Used as a plain link, so the browser saves the file. */
export function responsesCsvUrl(formId: number) {
  return `${API_URL}/api/forms/${formId}/responses.csv`;
}

export function getSummary(formId: number) {
  return request<FormSummary>("GET", `/api/forms/${formId}/summary`);
}

// ---- Public form (respondent) ----------------------------------------------------------

export function getPublicForm(publicId: string) {
  return request<PublicForm>("GET", `/api/public/forms/${publicId}`);
}

export function startResponse(publicId: string) {
  return request<{ token: string }>("POST", `/api/public/forms/${publicId}/responses`);
}

export function submitResponse(token: string, answers: AnswerPayload[]) {
  return request<{ status: string }>("POST", `/api/public/responses/${token}/submit`, { answers });
}
