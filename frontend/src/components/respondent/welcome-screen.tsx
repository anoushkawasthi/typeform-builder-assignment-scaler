/**
 * welcome-screen.tsx — the optional first screen of a form.
 *
 * What it does:   a centred title, a line of text and a Start button, shown before the
 *                 first question. The builder reuses the layout with editable text.
 * Depends on:     lib/formatted-text.tsx.
 * Depended on by: form-flow.tsx and components/builder/welcome-canvas.tsx.
 */

import type { ReactNode } from "react";

import { FormattedText } from "@/lib/formatted-text";

interface WelcomeScreenProps {
  title: string;
  text: string;
  buttonText: string;
  /** Start the form. Left out in the builder, where the button is only for show. */
  onStart?: () => void;
  /** Builder only: replacements for the read-only title and text. */
  titleContent?: ReactNode;
  textContent?: ReactNode;
}

export function WelcomeScreen({ title, text, buttonText, onStart, titleContent, textContent }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center text-center font-form">
      <h1 className="w-full text-[26px] leading-[34px] text-form-question @2xl:text-[32px] @2xl:leading-[40px]">
        {titleContent ?? <FormattedText text={title} />}
      </h1>
      {textContent ??
        (text !== "" && (
          <p className="mt-2 w-full whitespace-pre-line text-[18px] leading-[26px] text-form-question-80 @2xl:text-[20px]">
            <FormattedText text={text} />
          </p>
        ))}
      <button
        type="button"
        onClick={onStart}
        tabIndex={onStart === undefined ? -1 : 0}
        className="mt-8 inline-flex h-12 items-center rounded-lg bg-form-button px-6 text-[20px] font-semibold text-form-button-text transition-opacity duration-200 ease-form hover:opacity-80"
      >
        {buttonText}
      </button>
      {onStart !== undefined && (
        <p className="mt-3 hidden text-[12px] text-form-answer @2xl:block">
          press <strong className="font-semibold">Enter ↵</strong>
        </p>
      )}
    </div>
  );
}
