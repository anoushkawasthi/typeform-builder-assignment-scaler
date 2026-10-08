/**
 * flow-footer.tsx — the controls fixed to the bottom-right of a form.
 *
 * What it does:   the previous / next arrow buttons and the "made with" badge while
 *                 the form is being filled in; a full-width bar once it is submitted.
 * Depends on:     lucide-react (icons).
 * Depended on by: form-flow.tsx.
 */

import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import Link from "next/link";

interface FlowFooterProps {
  /** False on the thank-you screen, where there is nowhere left to go. */
  showNavigation: boolean;
  canGoBack: boolean;
  /** False on the last question: there the way forward is the Submit button. */
  canGoForward: boolean;
  /** True on the thank-you screen. */
  isFinished: boolean;
  onPrevious: () => void;
  /** The wide-screen down arrow: go to the next question, never submit. */
  onNext: () => void;
  /** The phone layout's big button: "OK", or "Submit" on the last question. */
  advanceLabel: string;
  onAdvance: () => void;
  isSubmitting: boolean;
}

const ARROW_BUTTON_CLASSES =
  "flex h-8 w-8 items-center justify-center bg-form-button text-form-button-text " +
  "transition-opacity duration-200 ease-form hover:opacity-80 disabled:opacity-30 disabled:hover:opacity-30";

export function FlowFooter({
  showNavigation,
  canGoBack,
  canGoForward,
  isFinished,
  onPrevious,
  onNext,
  advanceLabel,
  onAdvance,
  isSubmitting,
}: FlowFooterProps) {
  // After submitting, Typeform swaps the floating controls for a grey bar across the
  // bottom with its tagline and a small button.
  if (isFinished) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-14 items-center justify-end gap-3 border-t border-black/10 bg-[#F1F1F1] px-4 font-form">
        <span className="hidden text-[14px] text-black @2xl:inline">How you ask is everything</span>
        <Link href="/" className="flex h-6 items-center rounded bg-form-button px-2 text-[11px] text-form-button-text">
          Create a&nbsp;<strong className="font-semibold">form</strong>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Wide screens: two small arrows and the badge, floating in the corner. */}
      <div className="absolute bottom-8 right-8 z-10 hidden items-center gap-2 @2xl:flex">
        {showNavigation && (
          // Two buttons with a 2px gap and mirrored corner radii, so they read as one pill.
          <div className="flex gap-[2px]">
            <button
              type="button"
              aria-label="Previous question"
              disabled={!canGoBack}
              onClick={onPrevious}
              className={`${ARROW_BUTTON_CLASSES} rounded-[8px_2px_2px_8px]`}
            >
              {/* Drawn large and thin so the arrow is 14px wide with a 2px line, as Typeform's is. */}
              <ChevronUp aria-hidden="true" className="h-7 w-7" strokeWidth={1.7} />
            </button>
            <button
              type="button"
              aria-label="Next question"
              disabled={!canGoForward}
              onClick={onNext}
              className={`${ARROW_BUTTON_CLASSES} rounded-[2px_8px_8px_2px]`}
            >
              <ChevronDown aria-hidden="true" className="h-7 w-7" strokeWidth={1.7} />
            </button>
          </div>
        )}
        <span className="flex h-8 items-center rounded-lg bg-form-button px-3 font-form text-[12px] text-form-button-text">
          Made with&nbsp;<strong className="font-semibold">Typeform Replica</strong>
        </span>
      </div>

      {/* Phones: Typeform pins the OK button to the bottom of the screen, where a thumb
          reaches it, with a back button beside it from the second question on. The
          button under the answer is hidden at this size (see question-screen.tsx). */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-form-bg px-8 pb-4 font-form @2xl:hidden">
        {showNavigation && (
          <div className="flex gap-2">
            {canGoBack && (
              <button
                type="button"
                aria-label="Previous question"
                onClick={onPrevious}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-form-button text-form-button-text-90"
              >
                <ChevronLeft aria-hidden="true" className="h-7 w-7" strokeWidth={1.7} />
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onAdvance}
              className="h-11 flex-1 rounded-lg bg-form-button text-[20px] font-semibold leading-[26px] tracking-[-0.25px] text-form-button-text-90 disabled:opacity-60"
            >
              {advanceLabel}
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-[14px] leading-5 text-form-question">
          Made with <strong className="font-semibold">Typeform Replica</strong>
        </p>
      </div>
    </>
  );
}
