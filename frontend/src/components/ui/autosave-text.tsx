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

import { Bold, Italic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { toggleMarker } from "@/lib/formatted-text";

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
  /**
   * Show the B / I pop-up when text is selected. It wraps the selection in **bold** or
   * *italic* markers (see lib/formatted-text.tsx).
   */
  allowFormatting?: boolean;
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
  allowFormatting = false,
}: AutosaveTextProps) {
  const [text, setText] = useState(value);
  // True while some text in this field is selected; shows the B / I pop-up.
  const [hasSelection, setHasSelection] = useState(false);
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

  /** Called whenever the selection changes: show the pop-up only for a real selection. */
  function handleSelect() {
    const textarea = textareaRef.current;
    if (allowFormatting && textarea !== null) {
      setHasSelection(textarea.selectionStart !== textarea.selectionEnd);
    }
  }

  function applyFormatting(marker: "**" | "*") {
    const textarea = textareaRef.current;
    if (textarea === null) {
      return;
    }
    const result = toggleMarker(text, textarea.selectionStart, textarea.selectionEnd, marker);
    handleChange(result.text);
    // React re-renders the box with the new text first; only then can the same words
    // be selected again, so this waits for the next frame.
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
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

  const textarea = (
    <textarea
      ref={textareaRef}
      rows={1}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={() => {
        setHasSelection(false);
        saveNow(text);
      }}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
      // Like Typeform, the placeholder fades (but stays readable) once the field has focus.
      className={`block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:transition-opacity focus:placeholder:opacity-50 ${className ?? ""}`}
    />
  );

  if (!allowFormatting) {
    return textarea;
  }

  return (
    <div className="relative w-full min-w-0 flex-1">
      {hasSelection && (
        <div
          role="toolbar"
          aria-label="Text formatting"
          // Undo the form theme's font and any zoom-scaled sizes: this is admin UI.
          className="absolute -top-11 left-0 z-20 flex gap-1 rounded-lg bg-white p-1 font-admin shadow-[0_2px_12px_rgba(60,50,62,0.18)]"
        >
          {/* onMouseDown + preventDefault: a normal click would move focus to the
              button, which clears the selection before we can use it. */}
          <button
            type="button"
            aria-label="Bold"
            onMouseDown={(event) => {
              event.preventDefault();
              applyFormatting("**");
            }}
            className="flex h-8 w-9 items-center justify-center rounded-md text-admin-muted hover:bg-admin-hover"
          >
            <Bold className="h-4 w-4" strokeWidth={3} />
          </button>
          <button
            type="button"
            aria-label="Italic"
            onMouseDown={(event) => {
              event.preventDefault();
              applyFormatting("*");
            }}
            className="flex h-8 w-9 items-center justify-center rounded-md text-admin-muted hover:bg-admin-hover"
          >
            <Italic className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      )}
      {textarea}
    </div>
  );
}
