"use client";

/**
 * rating-answer.tsx — a row of stars (or hearts, crowns, ...).
 *
 * What it does:   draws `rating_max` shapes with their numbers underneath; clicking
 *                 shape N (or pressing the number key N) fills shapes 1 to N.
 * Depends on:     question-answer.tsx (props), rating-shapes.tsx (the drawings).
 * Depended on by: question-answer.tsx.
 */

import { useEffect, useState } from "react";

import type { QuestionAnswerProps } from "./question-answer";
import { RatingShapeIcon } from "./rating-shapes";

export function RatingAnswer({ question, value, onChange, isActive, isInteractive }: QuestionAnswerProps) {
  // The shape the mouse is over, so the row can preview the rating before a click.
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
            <RatingShapeIcon shape={question.rating_shape} isFilled={isFilled} />
            <span className="mt-4 font-form text-[16px] leading-[22px] text-form-answer-80 @2xl:mt-6">{rating}</span>
          </button>
        );
      })}
    </div>
  );
}
