"use client";

/**
 * dropdown-answer.tsx — a searchable dropdown.
 *
 * What it does:   closed, it is an underlined field showing the picked choice (or
 *                 "Type or select an option") with a small arrow. Clicking it, or just
 *                 starting to type, opens a panel over the field with a search box and
 *                 the list of choices. Picking one closes the panel and moves the form on.
 * Depends on:     question-answer.tsx (props), text-answer.tsx (shared field styling).
 * Depended on by: question-answer.tsx.
 *
 * Keyboard, while the panel is open: typing filters, the arrow keys move the highlight,
 * Enter picks, Escape closes. While it is closed the dropdown uses no keys of its own,
 * so Enter and the arrow keys move between questions as they do everywhere else.
 */

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FormattedText, stripFormatting } from "@/lib/formatted-text";
import type { Choice } from "@/lib/types";

import type { QuestionAnswerProps } from "./question-answer";
import { UNDERLINED_FIELD_CLASSES } from "./text-answer";

export function DropdownAnswer({ question, value, onChange, onCommit, isActive, isInteractive }: QuestionAnswerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedId = value?.choice_ids?.[0];
  const selectedChoice = question.choices.find((choice) => choice.id === selectedId);

  // Case-insensitive "contains" filter on what has been typed.
  const visibleChoices = question.choices.filter((choice) =>
    stripFormatting(choice.label).toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  function openEmpty() {
    setSearchText("");
    setHighlightedIndex(0);
    setIsOpen(true);
  }

  function pick(choice: Choice) {
    // Picking the choice that is already selected takes it back, which is the only way
    // to clear an optional dropdown.
    if (choice.id === selectedId) {
      onChange({ choice_ids: [] });
      setIsOpen(false);
      return;
    }
    onChange({ choice_ids: [choice.id] });
    setIsOpen(false);
    onCommit();
  }

  // When the panel opens, put the cursor in its search box.
  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  // While closed: a typed letter or digit opens the panel and becomes the first
  // character of the search, so "Type or select an option" is literally true.
  useEffect(() => {
    if (!isActive || !isInteractive || isOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      // A single visible character, not a named key such as "Enter" or "ArrowUp".
      if (event.key.length === 1 && event.key !== " ") {
        event.preventDefault();
        setSearchText(event.key);
        setHighlightedIndex(0);
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isInteractive, isOpen]);

  // While open: a click anywhere outside the dropdown closes the panel.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // stopPropagation throughout: the form also listens for these keys to change
    // question, and while the panel is open they belong to the list.
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((index) => Math.min(index + 1, visibleChoices.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (visibleChoices.length > 0) {
        pick(visibleChoices[highlightedIndex] ?? visibleChoices[0]);
      }
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Closed: looks like the other underlined fields, but is a button. */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={!isInteractive}
        tabIndex={isInteractive && isActive ? 0 : -1}
        onClick={openEmpty}
        className={
          `${UNDERLINED_FIELD_CLASSES} relative py-[6px] pr-6 text-left @2xl:py-2 ` +
          (selectedChoice === undefined ? "text-form-answer-40 " : "") +
          (isInteractive ? "cursor-pointer" : "cursor-default")
        }
      >
        {selectedChoice === undefined ? "Type or select an option" : stripFormatting(selectedChoice.label)}
        <ChevronDown aria-hidden="true" className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-form-answer" />
      </button>

      {/* Open: a panel laid over the field, 10px higher so its search box lands where
          the field was. */}
      {isOpen && isInteractive && (
        <div
          role="dialog"
          aria-label="Choose an option"
          className="absolute inset-x-0 -top-[10px] z-20 flex h-[358px] flex-col rounded-xl border border-form-answer-10 bg-form-bg shadow-[0_0_0_3px_color-mix(in_srgb,var(--form-answer)_4%,transparent)]"
        >
          <div className="relative mx-6 mt-[11px]">
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded={true}
              aria-controls={`dropdown-options-${question.id}`}
              value={searchText}
              placeholder="Type or select an option"
              onChange={(event) => {
                setSearchText(event.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className={`${UNDERLINED_FIELD_CLASSES} py-[6px] pr-6 @2xl:py-2`}
            />
            <Search aria-hidden="true" className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-form-answer" />
          </div>

          <ul
            id={`dropdown-options-${question.id}`}
            role="listbox"
            className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto px-6 pb-4 pt-4"
          >
            {visibleChoices.length === 0 && (
              <li className="px-1 py-2 font-form text-[16px] leading-[22px] text-form-answer-60">No suggestions found</li>
            )}
            {visibleChoices.map((choice, index) => (
              <li
                key={choice.id}
                role="option"
                aria-selected={choice.id === selectedId}
                // onMouseDown instead of onClick: it fires before the search box loses focus.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(choice);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={
                  "flex min-h-[44px] shrink-0 cursor-pointer items-center rounded-lg border px-3 py-[6px] font-form " +
                  "text-[16px] leading-[22px] text-form-answer " +
                  (choice.id === selectedId ? "border-form-answer-80 " : "border-form-answer-10 ") +
                  (index === highlightedIndex ? "bg-form-answer-10" : "bg-form-answer-6")
                }
              >
                <span className="p-1">{choice.label === "" ? "Choice" : <FormattedText text={choice.label} />}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
