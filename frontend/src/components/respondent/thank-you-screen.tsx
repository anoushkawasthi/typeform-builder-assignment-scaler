/**
 * thank-you-screen.tsx — what a respondent sees after submitting.
 *
 * What it does:   a centred tick, the form's thank-you title and text.
 * Depends on:     lucide-react (icon).
 * Depended on by: form-flow.tsx.
 */

import { Check } from "lucide-react";

interface ThankYouScreenProps {
  title: string;
  text: string;
}

export function ThankYouScreen({ title, text }: ThankYouScreenProps) {
  return (
    <div className="flex flex-col items-center text-center font-form">
      <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-[5px] border-form-question text-form-question">
        <Check aria-hidden="true" className="h-12 w-12" strokeWidth={3} />
      </span>
      <h1 className="mt-6 text-[24px] leading-[32px] text-form-question @2xl:text-[32px] @2xl:leading-[40px]">{title}</h1>
      {text !== "" && (
        <p className="mt-2 whitespace-pre-line text-[16px] leading-[24px] text-form-question-80 @2xl:text-[18px]">{text}</p>
      )}
    </div>
  );
}
