"use client";

/**
 * text-answer.tsx — the single-line answer field.
 *
 * What it does:   the large underlined input used by short text, email and number
 *                 questions. The three differ only in input type and placeholder.
 * Depends on:     question-answer.tsx (props).
 * Depended on by: question-answer.tsx.
 */

import { useEffect, useRef } from "react";

import type { QuestionAnswerProps } from "./question-answer";

interface TextAnswerProps extends QuestionAnswerProps {
  inputType: "text" | "email" | "number";
  placeholder: string;
}

// Shared by the long-text field and the dropdown, so every underlined field looks
// identical. The vertical padding is left to each of them, because Typeform's differ:
// one-line fields get 6px on phones and 8px on wide screens, the long-text field 8px
// and 6px.
export const UNDERLINED_FIELD_CLASSES =
  "block w-full bg-transparent font-form text-[20px] leading-[26px] tracking-[-0.25px] text-form-answer outline-none " +
  // The placeholder is a little fainter while the field has the cursor.
  "placeholder:text-form-answer-40 focus:placeholder:text-form-answer-30 " +
  // Typeform tightens its large text by half a pixel per letter.
  "@2xl:text-[26px] @2xl:leading-[34px] @2xl:tracking-[-0.5px] " +
  // The underline is a shadow, not a border, so it can thicken on focus without
  // shifting the layout by a pixel.
  "shadow-[0_1px_0_0_color-mix(in_srgb,var(--form-answer)_60%,transparent)] " +
  "focus:shadow-[0_2px_0_0_var(--form-answer)] " +
  "transition-shadow duration-200";

export function TextAnswer({ value, onChange, isActive, isInteractive, inputType, placeholder }: TextAnswerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Put the cursor in the field as soon as its question slides in, so the respondent
  // can type straight away. `preventScroll` stops the browser jumping mid-animation.
  useEffect(() => {
    if (isActive && isInteractive) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isActive, isInteractive]);

  return (
    <input
      ref={inputRef}
      type={inputType}
      // Shows the numeric keypad on phones for number questions.
      inputMode={inputType === "number" ? "decimal" : undefined}
      value={value?.text ?? ""}
      placeholder={placeholder}
      readOnly={!isInteractive}
      tabIndex={isInteractive && isActive ? 0 : -1}
      autoComplete={inputType === "email" ? "email" : "off"}
      onChange={(event) => onChange({ text: event.target.value })}
      className={`${UNDERLINED_FIELD_CLASSES} py-[6px] @2xl:py-2`}
    />
  );
}
