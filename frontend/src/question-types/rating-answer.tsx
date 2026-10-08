"use client";

/**
 * rating-answer.tsx — a row of stars.
 *
 * What it does:   draws `rating_max` stars with their numbers underneath; clicking star
 *                 N (or pressing the number key N) fills stars 1 to N.
 * Depends on:     question-answer.tsx (props).
 * Depended on by: question-answer.tsx.
 */

import { useEffect, useState } from "react";

import type { QuestionAnswerProps } from "./question-answer";

// A five-pointed star drawn in a 56x56 box.
const STAR_PATH =
  "M28 4.5l7.1 17.4 18.7 1.5-14.2 12.2 4.4 18.3L28 44.1 12 53.9l4.4-18.3L2.2 23.4l18.7-1.5L28 4.5z";

export function RatingAnswer({ question, value, onChange, isActive, isInteractive }: QuestionAnswerProps) {
  // The star the mouse is over, so the row can preview the rating before a click.
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const currentRating = value?.number ?? 0;
  const ratings: number[] = [];
  for (let rating = 1; rating <= question.rating_max; rating++) {
    ratings.push(rating);
  }

  // Number keys pick a rating. For a 10-point scale, "0" means 10.
  useEffect(() => {
    if (!isActive || !isInteractive) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (!/^[0-9]$/.test(event.key)) {
        return;
      }
      let rating = Number(event.key);
      if (rating === 0) {
        rating = 10;
      }
      if (rating >= 1 && rating <= question.rating_max) {
        event.preventDefault();
        onChange({ number: rating });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isInteractive, question.rating_max, onChange]);

  // While hovering, show the hovered rating; otherwise show the saved one.
  const shownRating = hoveredRating ?? currentRating;

  return (
    <div role="radiogroup" className="flex flex-wrap gap-2" onMouseLeave={() => setHoveredRating(null)}>
      {ratings.map((rating) => {
        const isFilled = rating <= shownRating;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={currentRating === rating}
            aria-label={`${rating} out of ${question.rating_max}`}
            tabIndex={isInteractive && isActive ? 0 : -1}
            onMouseEnter={() => isInteractive && setHoveredRating(rating)}
            onClick={() => isInteractive && onChange({ number: rating })}
            className={"flex w-10 flex-col items-center @2xl:w-14 " + (isInteractive ? "cursor-pointer" : "cursor-default")}
          >
            <svg viewBox="0 0 56 56" className="h-10 w-10 @2xl:h-14 @2xl:w-14" aria-hidden="true">
              <path
                d={STAR_PATH}
                strokeWidth="2.5"
                strokeLinejoin="round"
                className={
                  "transition-[fill,stroke] duration-200 ease-form " +
                  (isFilled ? "fill-form-answer-30 stroke-form-answer" : "fill-transparent stroke-form-answer-60")
                }
              />
            </svg>
            <span className="mt-4 font-form text-[16px] leading-[24px] text-form-answer">{rating}</span>
          </button>
        );
      })}
    </div>
  );
}
