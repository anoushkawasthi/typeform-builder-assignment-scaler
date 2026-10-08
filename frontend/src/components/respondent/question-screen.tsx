"use client";

/**
 * question-screen.tsx — one question, laid out the Typeform way.
 *
 * What it does:   the number badge, the title, the description, the answer control, and
 *                 underneath either the OK/Submit button or a validation error.
 * Depends on:     question-types/question-answer.tsx, lib/types.ts.
 * Depended on by: form-flow.tsx (public form and preview) and
 *                 components/builder/question-canvas.tsx.
 *
 * The builder reuses this exact layout but swaps the title, description and (for choice
 * questions) the answer for editable versions, through the optional `...Content` props.
 */

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import type { AnswerValue, RenderableQuestion } from "@/lib/types";
import { QuestionAnswer } from "@/question-types/question-answer";

interface QuestionScreenProps {
  question: RenderableQuestion;
  /** The number shown in the badge (1 for the first question). */
  number: number;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Move to the next question (or submit, on the last one). */
  onCommit: () => void;
  isActive: boolean;
  isInteractive: boolean;
  /** Validation message to show instead of the button, if any. */
  error?: string | null;
  isLastQuestion?: boolean;
  isSubmitting?: boolean;
  /** Builder only: replacements for the read-only title, description and answer. */
  titleContent?: ReactNode;
  descriptionContent?: ReactNode;
  answerContent?: ReactNode;
}

export function QuestionScreen({
  question,
  number,
  value,
  onChange,
  onCommit,
  isActive,
  isInteractive,
  error = null,
  isLastQuestion = false,
  isSubmitting = false,
  titleContent,
  descriptionContent,
  answerContent,
}: QuestionScreenProps) {
  const titleId = `question-title-${question.id}`;

  return (
    <div className="relative font-form">
      {/* Number badge. On wide screens it hangs in the left margin beside the title;
          on phones there is no margin, so it sits above the title instead. */}
      <span
        aria-hidden="true"
        className={
          "mb-2 inline-flex h-[19px] min-w-4 items-center justify-center rounded-[5px_3px] px-1 " +
          "bg-form-question text-[11px] font-bold leading-none text-form-bg " +
          "sm:absolute sm:-left-[26px] sm:top-[8px] sm:mb-0"
        }
      >
        {number}
      </span>

      <h1 id={titleId} className="text-[20px] font-normal leading-[28px] text-form-question sm:text-[26px] sm:leading-[34px]">
        {titleContent ?? (
          <>
            {question.title === "" ? "..." : question.title}
            {question.is_required && <span aria-label="required"> *</span>}
          </>
        )}
      </h1>

      {descriptionContent ??
        (question.description !== "" && (
          <p className="mt-2 whitespace-pre-line text-[16px] leading-[24px] text-form-question-80 sm:text-[18px]">
            {question.description}
          </p>
        ))}

      <div className="mt-8" aria-labelledby={titleId}>
        {answerContent ?? (
          <QuestionAnswer
            question={question}
            value={value}
            onChange={onChange}
            onCommit={onCommit}
            isActive={isActive}
            isInteractive={isInteractive}
          />
        )}
      </div>

      {/* Typeform shows the error in the place of the OK button, so there is always
          exactly one thing under the answer: what to do next, or what to fix. */}
      <div className="mt-8 min-h-[40px]">
        {error !== null ? (
          <div
            role="alert"
            className="inline-flex items-center gap-2 rounded-[6px] bg-form-error-bg px-[10px] py-[6px] text-[14px] leading-[18px] text-form-error"
          >
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            {error}
          </div>
        ) : (
          <button
            type="button"
            onClick={onCommit}
            disabled={!isInteractive || isSubmitting}
            tabIndex={isInteractive && isActive ? 0 : -1}
            className={
              "inline-flex h-10 items-center rounded-lg bg-form-button px-[18px] text-[14px] font-semibold " +
              "text-form-button-text transition-opacity duration-200 ease-form " +
              (isInteractive ? "hover:opacity-80 " : "cursor-default ") +
              (isSubmitting ? "opacity-60" : "")
            }
          >
            {isLastQuestion ? (isSubmitting ? "Submitting..." : "Submit") : "OK"}
          </button>
        )}
      </div>
    </div>
  );
}
