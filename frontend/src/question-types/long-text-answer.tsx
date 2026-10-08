"use client";

/**
 * long-text-answer.tsx — the multi-line answer field.
 *
 * What it does:   a textarea that starts one line tall and grows as the respondent
 *                 types, with the "Shift + Enter" hint underneath.
 * Depends on:     question-answer.tsx (props), text-answer.tsx (shared field styling).
 * Depended on by: question-answer.tsx.
 */

import { useEffect, useRef } from "react";

import type { QuestionAnswerProps } from "./question-answer";
import { UNDERLINED_FIELD_CLASSES } from "./text-answer";

export function LongTextAnswer({ value, onChange, isActive, isInteractive }: QuestionAnswerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = value?.text ?? "";

  useEffect(() => {
    if (isActive && isInteractive) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [isActive, isInteractive]);

  // Grow with the content: reset the height, then set it to whatever the text needs.
  // Runs after every change to the text.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  return (
    <div>
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        placeholder="Type your answer here..."
        readOnly={!isInteractive}
        tabIndex={isInteractive && isActive ? 0 : -1}
        onChange={(event) => onChange({ text: event.target.value })}
        className={`${UNDERLINED_FIELD_CLASSES} resize-none overflow-hidden`}
      />
      {/* Enter moves to the next question (handled in form-flow.tsx), so the hint tells
          the respondent how to make a new line instead. */}
      <p className="mt-2 font-form text-[12px] leading-[16px] text-form-answer">
        <strong className="font-semibold">Shift ⇧ + Enter ↵</strong> to make a line break
      </p>
    </div>
  );
}
