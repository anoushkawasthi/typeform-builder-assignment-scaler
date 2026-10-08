/**
 * types.ts — the shapes of the data the API sends and receives.
 *
 * What it does:   TypeScript versions of the Pydantic models in backend/app/schemas.py.
 * Depends on:     nothing.
 * Depended on by: lib/api.ts and every component that handles forms or responses.
 *
 * Field names are snake_case on purpose: they match the JSON exactly, so there is no
 * conversion layer to keep in sync.
 */

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export type FormStatus = "draft" | "published";

export interface Choice {
  id: number;
  label: string;
}

export type LogicOperator = "always" | "is" | "is_not" | "less_than" | "greater_than";

/**
 * One logic-jump rule on a question: "if the answer <operator> <value>, go to <target>".
 * Only one compare field is set, depending on the question type. A null target means
 * "jump to the end of the form".
 */
export interface LogicJump {
  id: number;
  operator: LogicOperator;
  compare_choice_id: number | null;
  compare_number: number | null;
  compare_boolean: boolean | null;
  target_question_id: number | null;
}

/** A rule being created or replaced: the same fields without the id. */
export type LogicJumpInput = Omit<LogicJump, "id">;

export interface Theme {
  background_color: string;
  question_color: string;
  answer_color: string;
  button_color: string;
  button_text_color: string;
  font: string;
}

/**
 * The parts of a question that decide how it is drawn and answered. Both the builder's
 * draft question and the published question have these, so the shared question
 * components (src/question-types) accept this type and work for both.
 */
export interface RenderableQuestion {
  id: number;
  type: QuestionType;
  title: string;
  description: string;
  is_required: boolean;
  allow_multiple: boolean;
  rating_max: number;
  choices: Choice[];
  logic_jumps: LogicJump[];
}

/** A question in the builder (the draft). */
export interface Question extends RenderableQuestion {
  position: number;
  answer_count: number;
}

export interface FormListItem {
  id: number;
  public_id: string;
  title: string;
  status: FormStatus;
  response_count: number;
  question_count: number;
  has_unpublished_changes: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormDetail {
  id: number;
  public_id: string;
  title: string;
  status: FormStatus;
  response_count: number;
  has_unpublished_changes: boolean;
  answers_lost_on_publish: number;
  theme: Theme;
  thank_you_title: string;
  thank_you_text: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  questions: Question[];
}

/** Fields that PATCH /api/forms/{id} accepts. All optional. */
export interface FormUpdate {
  title?: string;
  thank_you_title?: string;
  thank_you_text?: string;
  theme_background_color?: string;
  theme_question_color?: string;
  theme_answer_color?: string;
  theme_button_color?: string;
  theme_button_text_color?: string;
  theme_font?: string;
}

/** Fields that PATCH /api/questions/{id} accepts. All optional. */
export interface QuestionUpdate {
  type?: QuestionType;
  title?: string;
  description?: string;
  is_required?: boolean;
  allow_multiple?: boolean;
  rating_max?: number;
}

/** What the respondent flow needs. The public API and the builder preview both produce it. */
export interface FillableForm {
  title: string;
  theme: Theme;
  thank_you_title: string;
  thank_you_text: string;
  questions: RenderableQuestion[];
}

export interface PublicForm extends FillableForm {
  public_id: string;
}

/**
 * One answer while a form is being filled in. Which field is used depends on the
 * question type, exactly like the columns of the `answers` table:
 *   text       -> short_text, long_text, email (and number, while it is being typed)
 *   boolean    -> yes_no
 *   number     -> rating
 *   choice_ids -> multiple_choice, dropdown
 */
export interface AnswerValue {
  text?: string;
  number?: number | null;
  boolean?: boolean | null;
  choice_ids?: number[];
}

/** All answers so far, keyed by question id. */
export type AnswerMap = Record<number, AnswerValue>;

/** One answer in the body of the submit request. */
export interface AnswerPayload {
  question_id: number;
  text?: string;
  number?: number;
  boolean?: boolean;
  choice_ids?: number[];
}

export interface AnswerError {
  question_id: number;
  message: string;
}

export interface AnswerOut {
  question_id: number;
  text: string | null;
  number: number | null;
  boolean: boolean | null;
  choice_labels: string[];
  display: string;
}

export interface ResponseOut {
  id: number;
  started_at: string;
  submitted_at: string;
  answers: AnswerOut[];
}

export interface ResponsesTable {
  questions: RenderableQuestion[];
  responses: ResponseOut[];
}

export interface Bucket {
  label: string;
  count: number;
}

export interface QuestionSummary {
  question_id: number;
  type: QuestionType;
  title: string;
  answer_count: number;
  buckets: Bucket[];
  average: number | null;
  recent_texts: string[];
}

export interface FormSummary {
  started_count: number;
  submitted_count: number;
  completion_rate: number | null;
  questions: QuestionSummary[];
}
