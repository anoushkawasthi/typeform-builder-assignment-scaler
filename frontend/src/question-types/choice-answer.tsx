"use client";

/**
 * choice-answer.tsx — a vertical list of pickable boxes with keyboard shortcuts.
 *
 * What it does:   draws the choices of a multiple-choice question (keys A, B, C...) and
 *                 of a Yes/No question (keys Y, N), handles clicks and letter keys, and
 *                 moves the form on after a single-select pick.
 * Depends on:     question-answer.tsx (props), lib/types.ts, lucide-react (tick icon).
 * Depended on by: question-answer.tsx.
 */

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { FormattedText } from "@/lib/formatted-text";
import type { Choice } from "@/lib/types";

import type { QuestionAnswerProps } from "./question-answer";

interface ChoiceAnswerProps extends QuestionAnswerProps {
  choices: Choice[];
  selectedIds: number[];
  allowMultiple: boolean;
  /** Called with the full new selection. */
  onSelect: (choiceIds: number[]) => void;
  /** Shortcut key for each choice, in order. Defaults to A, B, C... */
  keys?: string[];
}

// How long the picked choice blinks before the form moves on. Long enough to see what
// you picked, short enough not to feel slow.
const ADVANCE_DELAY_MS = 500;

function letterForIndex(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

export function ChoiceAnswer({
  choices,
  selectedIds,
  allowMultiple,
  onSelect,
  onCommit,
  keys,
  isActive,
  isInteractive,
}: ChoiceAnswerProps) {
  // Which choice is currently blinking, if any.
  const [blinkingId, setBlinkingId] = useState<number | null>(null);

  function keyForIndex(index: number): string {
    if (keys !== undefined) {
      return keys[index];
    }
    return letterForIndex(index);
  }

  function pick(choice: Choice) {
    if (!isInteractive) {
      return;
    }

    if (allowMultiple) {
      // Toggle: clicking a selected choice removes it. The respondent presses OK when done.
      const isSelected = selectedIds.includes(choice.id);
      if (isSelected) {
        onSelect(selectedIds.filter((id) => id !== choice.id));
      } else {
        onSelect([...selectedIds, choice.id]);
      }
      return;
    }

    // Single select: record the pick, blink it, then move on by itself.
    onSelect([choice.id]);
    setBlinkingId(choice.id);
    window.setTimeout(() => {
      setBlinkingId(null);
      onCommit();
    }, ADVANCE_DELAY_MS);
  }

  // Letter shortcuts. Listening on the window (not on a focused element) means they work
  // as soon as the question appears, without the respondent clicking anything first.
  useEffect(() => {
    if (!isActive || !isInteractive) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Leave browser shortcuts such as Ctrl+C alone.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const pressed = event.key.toUpperCase();
      for (let index = 0; index < choices.length; index++) {
        if (keyForIndex(index) === pressed) {
          event.preventDefault();
          pick(choices[index]);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Re-subscribe whenever the selection changes so `pick` sees the latest selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isInteractive, choices, selectedIds, allowMultiple]);

  if (choices.length === 0) {
    return <p className="font-form text-[16px] text-form-answer-60">This question has no choices yet.</p>;
  }

  return (
    <div>
      {allowMultiple && (
        <p className="mb-2 font-form text-[14px] leading-[20px] text-form-answer">Choose as many as you like</p>
      )}

      <div
        role={allowMultiple ? "group" : "radiogroup"}
        className="flex w-full flex-col items-stretch gap-2 @2xl:inline-flex @2xl:w-auto @2xl:min-w-[256px]"
      >
        {choices.map((choice, index) => {
          const isSelected = selectedIds.includes(choice.id);
          return (
            <button
              key={choice.id}
              type="button"
              role={allowMultiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              tabIndex={isInteractive && isActive ? 0 : -1}
              onClick={() => pick(choice)}
              className={
                "flex min-h-[44px] items-center gap-1 rounded-lg px-[10px] py-[6px] text-left font-form " +
                "bg-form-answer-6 transition-[box-shadow,background-color] duration-200 ease-form " +
                // The outline is a shadow ring: thin when idle, bold when selected.
                (isSelected
                  ? "shadow-[0_0_0_2px_color-mix(in_srgb,var(--form-answer)_80%,transparent)] "
                  : "shadow-[0_0_0_1px_color-mix(in_srgb,var(--form-answer)_10%,transparent)] hover:bg-form-answer-10 ") +
                (blinkingId === choice.id ? "animate-choice-blink " : "") +
                (isInteractive ? "cursor-pointer" : "cursor-default")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "flex h-6 min-w-6 items-center justify-center rounded-[4px] border px-[6px] " +
                  "text-[12px] font-semibold leading-none " +
                  (isSelected
                    ? "border-form-answer bg-form-answer text-form-bg"
                    : "border-form-answer-24 bg-form-bg text-form-answer")
                }
              >
                {keyForIndex(index)}
              </span>
              <span className="flex-1 px-1 text-[18px] leading-[24px] text-form-answer">
                {choice.label === "" ? "Choice" : <FormattedText text={choice.label} />}
              </span>
              {/* The tick keeps its space when hidden so boxes do not change width on select. */}
              <Check
                aria-hidden="true"
                className={"h-5 w-5 text-form-answer " + (isSelected ? "opacity-100" : "opacity-0")}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
