"use client";

/**
 * autosave-text.tsx — a text field that saves itself.
 *
 * What it does:   an auto-growing text box for editing in place (question titles,
 *                 descriptions, choice labels, the thank-you text). It saves shortly
 *                 after the creator stops typing, and immediately when they click away.
 * Depends on:     nothing.
 * Depended on by: builder (canvas, choice editor, settings dialogs).
 *
 * The tricky part: after a save, the server sends the form back and this component
 * receives a new `value`. If we copied that into the box while the creator was still
 * typing, their newest keystrokes would be overwritten by slightly older text. So the
 * box keeps its own copy and only accepts an outside value while it is not focused.
 */

import { useEffect, useRef, useState } from "react";

interface AutosaveTextProps {
  /** The saved value. */
  value: string;
  onSave: (text: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** False = Enter leaves the field instead of adding a line (for one-line values). */
  allowLineBreaks?: boolean;
  autoFocus?: boolean;
  /** Called when Enter is pressed in a one-line field. */
  onEnter?: () => void;
  /** Called when Backspace is pressed in an already-empty field. */
  onBackspaceWhenEmpty?: () => void;
}

// Wait this long after the last keystroke before saving, so typing a sentence is one
// request rather than one per letter.
const SAVE_DELAY_MS = 600;

export function AutosaveText({
  value,
  onSave,
  placeholder,
  ariaLabel,
  className,
  allowLineBreaks = false,
  autoFocus = false,
  onEnter,
  onBackspaceWhenEmpty,
}: AutosaveTextProps) {
  const [text, setText] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  // The last text we sent (or received), to avoid saving when nothing changed.
  const lastSavedRef = useRef(value);

  // Accept a new value from outside only when the creator is not typing here.
  useEffect(() => {
    const isFocused = document.activeElement === textareaRef.current;
    if (!isFocused) {
      setText(value);
      lastSavedRef.current = value;
    }
  }, [value]);

  // Grow to fit the text, so it never scrolls inside itself.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  function saveNow(textToSave: string) {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (textToSave !== lastSavedRef.current) {
      lastSavedRef.current = textToSave;
      onSave(textToSave);
    }
  }

  function handleChange(newText: string) {
    setText(newText);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => saveNow(newText), SAVE_DELAY_MS);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !allowLineBreaks) {
      event.preventDefault();
      saveNow(text);
      if (onEnter) {
        onEnter();
      } else {
        textareaRef.current?.blur();
      }
    }
    if (event.key === "Backspace" && text === "" && onBackspaceWhenEmpty) {
      event.preventDefault();
      onBackspaceWhenEmpty();
    }
  }

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={() => saveNow(text)}
      onKeyDown={handleKeyDown}
      className={`block w-full resize-none overflow-hidden bg-transparent outline-none ${className ?? ""}`}
    />
  );
}
