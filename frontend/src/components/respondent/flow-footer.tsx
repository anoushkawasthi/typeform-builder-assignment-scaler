/**
 * flow-footer.tsx — the controls fixed to the bottom-right of a form.
 *
 * What it does:   the previous / next arrow buttons and the "made with" badge.
 * Depends on:     lucide-react (icons).
 * Depended on by: form-flow.tsx.
 */

import { ChevronDown, ChevronUp } from "lucide-react";

interface FlowFooterProps {
  /** False on the thank-you screen, where there is nowhere left to go. */
  showNavigation: boolean;
  canGoBack: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const ARROW_BUTTON_CLASSES =
  "flex h-8 w-8 items-center justify-center bg-form-button text-form-button-text " +
  "transition-opacity duration-200 ease-form hover:opacity-80 disabled:opacity-30 disabled:hover:opacity-30";

export function FlowFooter({ showNavigation, canGoBack, onPrevious, onNext }: FlowFooterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-10 flex items-center gap-2 sm:bottom-8 sm:right-8">
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
            <ChevronUp aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next question"
            onClick={onNext}
            className={`${ARROW_BUTTON_CLASSES} rounded-[2px_8px_8px_2px]`}
          >
            <ChevronDown aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      )}
      <span className="flex h-8 items-center rounded-lg bg-form-button px-3 font-form text-[12px] text-form-button-text">
        Made with&nbsp;<strong className="font-semibold">Typeform Replica</strong>
      </span>
    </div>
  );
}
