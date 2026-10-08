/**
 * welcome-screen.tsx — the optional first screen of a form.
 *
 * What it does:   a centred title, a line of text, a Start button and an estimate of
 *                 how long the form takes, shown before the first question. The
 *                 builder reuses the layout with editable text.
 * Depends on:     lib/formatted-text.tsx, lucide-react (clock icon).
 * Depended on by: form-flow.tsx and components/builder/welcome-canvas.tsx.
 */

import { Clock } from "lucide-react";
import type { ReactNode } from "react";

import { FormattedText } from "@/lib/formatted-text";

interface WelcomeScreenProps {
  title: string;
  text: string;
  buttonText: string;
  /** How many questions the form has, for the "Takes ..." line under the button. */
  questionCount: number;
  /** Start the form. Left out in the builder, where the button is only for show. */
  onStart?: () => void;
  /** Builder only: replacements for the read-only title and text. */
  titleContent?: ReactNode;
  textContent?: ReactNode;
}

// Typeform prints an estimate under the Start button; for a one-question form it said
// "Takes 15 sec". We use the same figure for every question.
const SECONDS_PER_QUESTION = 15;

/** 1 question -> "Takes 15 sec"; 8 questions -> "Takes 2 min". */
export function timeToComplete(questionCount: number): string {
  const seconds = questionCount * SECONDS_PER_QUESTION;
  if (seconds < 60) {
    return `Takes ${seconds} sec`;
  }
  return `Takes ${Math.round(seconds / 60)} min`;
}

export function WelcomeScreen({
  title,
  text,
  buttonText,
  questionCount,
  onStart,
  titleContent,
  textContent,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center text-center font-form">
      <h1 className="w-full text-[26px] leading-[34px] tracking-[-0.5px] text-form-question @2xl:text-[32px] @2xl:leading-[40px] @2xl:tracking-[-0.75px]">
        {titleContent ?? <FormattedText text={title} />}
      </h1>
      {textContent ??
        (text !== "" && (
          <p className="mt-2 w-full whitespace-pre-line text-[16px] leading-[22px] text-form-question @2xl:text-[18px] @2xl:leading-6">
            <FormattedText text={text} />
          </p>
        ))}
      <button
        type="button"
        onClick={onStart}
        tabIndex={onStart === undefined ? -1 : 0}
        // Wide screens only: on a phone the Start button is the big button pinned to the
        // bottom of the screen (flow-footer.tsx), with the estimate above it.
        className="mt-8 hidden h-10 min-w-[100px] items-center justify-center @2xl:inline-flex rounded-lg bg-form-button px-4 text-[18px] font-semibold leading-6 text-form-button-text-90 transition-opacity duration-200 ease-form hover:opacity-80"
      >
        {buttonText}
      </button>
      {questionCount > 0 && (
        <p className="mt-2 hidden items-center gap-1 text-[14px] leading-[18px] text-form-question @2xl:flex">
          <Clock aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
          {timeToComplete(questionCount)}
        </p>
      )}
    </div>
  );
}
