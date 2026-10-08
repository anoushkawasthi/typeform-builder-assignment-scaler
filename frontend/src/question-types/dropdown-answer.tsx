"use client";

/**
 * dropdown-answer.tsx — a searchable dropdown.
 *
 * What it does:   an underlined text field ("Type or select an option") with a list of
 *                 choices under it. Typing filters the list; arrow keys move the
 *                 highlight; Enter or a click picks a choice and moves the form on.
 * Depends on:     question-answer.tsx (props), text-answer.tsx (shared field styling).
 * Depended on by: question-answer.tsx.
 */

import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FormattedText, stripFormatting } from "@/lib/formatted-text";
import type { Choice } from "@/lib/types";

import type { QuestionAnswerProps } from "./question-answer";
import { UNDERLINED_FIELD_CLASSES } from "./text-answer";

export function DropdownAnswer({ question, value, onChange, onCommit, isActive, isInteractive }: QuestionAnswerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedId = value?.choice_ids?.[0];
  const selectedChoice = question.choices.find((choice) => choice.id === selectedId);

  // Case-insensitive "contains" filter on what has been typed.
  const visibleChoices = question.choices.filter((choice) =>
    stripFormatting(choice.label).toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  useEffect(() => {
    if (isActive && isInteractive) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isActive, isInteractive]);

  function pick(choice: Choice) {
    onChange({ choice_ids: [choice.id] });
    setSearchText("");
    setIsOpen(false);
    onCommit();
  }

  function clearSelection() {
    onChange({ choice_ids: [] });
    setSearchText("");
    setIsOpen(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      // stopPropagation: the form also listens for arrow keys to change question.
      event.stopPropagation();
      setIsOpen(true);
      setHighlightedIndex((index) => Math.min(index + 1, visibleChoices.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && isOpen && visibleChoices.length > 0) {
      // While the list is open, Enter picks the highlighted choice instead of the
      // form's default "go to next question".
      event.preventDefault();
      event.stopPropagation();
      pick(visibleChoices[highlightedIndex] ?? visibleChoices[0]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`dropdown-options-${question.id}`}
          // Once something is picked the field shows it; typing starts a new search.
          value={selectedChoice && searchText === "" ? stripFormatting(selectedChoice.label) : searchText}
          placeholder="Type or select an option"
          readOnly={!isInteractive}
          tabIndex={isInteractive && isActive ? 0 : -1}
          onFocus={() => isInteractive && selectedChoice === undefined && setIsOpen(true)}
          onClick={() => isInteractive && setIsOpen(true)}
          onChange={(event) => {
            if (selectedChoice !== undefined) {
              onChange({ choice_ids: [] });
            }
            setSearchText(event.target.value);
            setHighlightedIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`${UNDERLINED_FIELD_CLASSES} pr-10`}
        />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-form-answer">
          {selectedChoice !== undefined && isInteractive ? (
            <button type="button" aria-label="Clear selection" onClick={clearSelection} className="p-1">
              <X className="h-6 w-6" />
            </button>
          ) : (
            <ChevronDown aria-hidden="true" className="h-6 w-6 opacity-60" />
          )}
        </span>
      </div>

      {isOpen && isInteractive && (
        <ul
          id={`dropdown-options-${question.id}`}
          role="listbox"
          className="mt-3 flex max-h-[220px] flex-col gap-1 overflow-y-auto p-[2px]"
        >
          {visibleChoices.length === 0 && (
            <li className="px-3 py-2 font-form text-[16px] text-form-answer-60">No suggestions found</li>
          )}
          {visibleChoices.map((choice, index) => (
            <li
              key={choice.id}
              role="option"
              aria-selected={index === highlightedIndex}
              // onMouseDown instead of onClick: it fires before the input loses focus.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(choice);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={
                "cursor-pointer rounded-lg px-3 py-2 font-form text-[18px] leading-[24px] text-form-answer " +
                "shadow-[0_0_0_1px_color-mix(in_srgb,var(--form-answer)_10%,transparent)] " +
                (index === highlightedIndex ? "bg-form-answer-10" : "bg-form-answer-6")
              }
            >
              {choice.label === "" ? "Choice" : <FormattedText text={choice.label} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
