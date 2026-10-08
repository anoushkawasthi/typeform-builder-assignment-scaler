/**
 * thank-you-screen.tsx — what a respondent sees after submitting.
 *
 * What it does:   a centred tick in a ring, the form's thank-you title and text, and a
 *                 button inviting the respondent to make a form of their own, laid out
 *                 like Typeform's ending screen.
 * Depends on:     lib/formatted-text.tsx, lucide-react (icon), next/link.
 * Depended on by: form-flow.tsx.
 */

import { Check } from "lucide-react";
import Link from "next/link";

import { FormattedText } from "@/lib/formatted-text";

interface ThankYouScreenProps {
  title: string;
  text: string;
}

export function ThankYouScreen({ title, text }: ThankYouScreenProps) {
  return (
    <div className="flex flex-col items-center text-center font-form">
      {/* A thin ring and tick in the button colour, as on Typeform's ending. */}
      <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-[4px] border-form-button text-form-button">
        {/* Drawn large with a thin line: the tick is about 44px wide with a 4px stroke. */}
        <Check aria-hidden="true" className="h-16 w-16" strokeWidth={1.5} />
      </span>
      <h1 className="mt-3 text-[24px] leading-[32px] tracking-[-0.5px] text-form-question @2xl:text-[32px] @2xl:leading-[40px] @2xl:tracking-[-0.75px]">
        <FormattedText text={title} />
      </h1>
      {text !== "" && (
        <p className="whitespace-pre-line text-[24px] leading-[32px] tracking-[-0.5px] text-form-question @2xl:text-[32px] @2xl:leading-[40px] @2xl:tracking-[-0.75px]">
          <FormattedText text={text} />
        </p>
      )}
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-lg bg-form-button px-4 text-[18px] font-semibold text-form-button-text-90 transition-opacity duration-200 ease-form hover:opacity-80"
      >
        Create your own form
      </Link>
    </div>
  );
}
