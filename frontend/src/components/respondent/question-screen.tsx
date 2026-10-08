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

import { FormattedText } from "@/lib/formatted-text";
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
  /** Builder only: Typeform's canvas shows the question without the OK button. */
  hideButton?: boolean;
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
  hideButton = false,
}: QuestionScreenProps) {
  const titleId = `question-title-${question.id}`;

  return (
    <div className="relative font-form">
      {/* Number badge. On wide screens it hangs in the left margin beside the title;
          on phones there is no margin, so it sits above the title instead. */}
      <span
        aria-hidden="true"
        className={
          "mb-3 flex h-[19px] w-fit min-w-4 items-center justify-center rounded-[5px_3px] px-1 " +
          "bg-form-question text-[11px] font-bold leading-none text-form-bg " +
          "@2xl:absolute @2xl:-left-[26px] @2xl:top-[8px] @2xl:mb-0"
        }
      >
        {number}
      </span>

      {/* Title and description, 8px apart. The description is drawn even when it is
          empty: it then has no height, but the 8px stays, which is how Typeform ends up
          with the same space above the answer whether or not there is a description. */}
      <div className="flex flex-col gap-2">
        <h1
          id={titleId}
          className="text-[20px] font-normal leading-[26px] tracking-[-0.25px] text-form-question @2xl:text-[26px] @2xl:leading-[34px] @2xl:tracking-[-0.5px]"
        >
          {titleContent ?? (
            <>
              {question.title === "" ? "..." : <FormattedText text={question.title} />}
              {question.is_required && <span aria-label="required"> *</span>}
            </>
          )}
        </h1>

        {descriptionContent ?? (
          <p className="whitespace-pre-line text-[16px] leading-[24px] text-form-question-80 @2xl:text-[18px]">
            <FormattedText text={question.description} />
          </p>
        )}
      </div>

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
      {!hideButton && error !== null && (
        <div className="mt-8 min-h-[40px]">
          <div
            role="alert"
            className="inline-flex items-center gap-2 rounded-[6px] bg-form-error-bg px-[10px] py-[6px] text-[14px] leading-[18px] text-form-error"
          >
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* The button under the answer is for wide screens only. On a phone the same
          action is the big button pinned to the bottom (flow-footer.tsx). */}
      {!hideButton && error === null && (
        <div className="mt-8 hidden min-h-[40px] @2xl:block">
          <button
            type="button"
            onClick={onCommit}
            disabled={!isInteractive || isSubmitting}
            tabIndex={isInteractive && isActive ? 0 : -1}
            className={
              "inline-flex h-10 items-center rounded-lg bg-form-button px-4 text-[18px] font-semibold leading-6 " +
              "text-form-button-text-90 transition-opacity duration-200 ease-form " +
              (isInteractive ? "hover:opacity-80 " : "cursor-default ") +
              (isSubmitting ? "opacity-60" : "")
            }
          >
            {isLastQuestion ? (isSubmitting ? "Submitting..." : "Submit") : "OK"}
          </button>
          {/* On the last question Typeform reminds keyboard users how to send the form. */}
          {isLastQuestion && isInteractive && (
            <span className="ml-3 align-middle text-[12px] text-form-answer">
              press <strong className="font-semibold">Ctrl + Enter ↵</strong>
            </span>
          )}
          {/* Typeform prints this warning under every Submit button. */}
          {isLastQuestion && <p className="mt-2 text-[14px] leading-[18px] text-form-answer-80">Never submit passwords!</p>}
        </div>
      )}

      {/* On a phone the same warning sits under the answer, as the button is elsewhere. */}
      {!hideButton && error === null && isLastQuestion && (
        <p className="mt-8 text-[14px] leading-[18px] text-form-answer-80 @2xl:hidden">Never submit passwords!</p>
      )}
    </div>
  );
}
