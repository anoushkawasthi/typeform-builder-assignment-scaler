"use client";

/**
 * choice-editor.tsx — editing the options of a multiple-choice or dropdown question.
 *
 * What it does:   shows each choice as an editable box with its letter key, a remove
 *                 button, and an "Add choice" link.
 * Depends on:     ui/autosave-text.tsx, lib/types.ts.
 * Depended on by: question-canvas.tsx.
 *
 * Each edit is its own request (add one, rename one, remove one). Sending the whole
 * list on every keystroke would let two quick edits overwrite each other.
 */

import { X } from "lucide-react";
import { useState } from "react";

import { AutosaveText } from "@/components/ui/autosave-text";
import type { Choice } from "@/lib/types";

interface ChoiceEditorProps {
  choices: Choice[];
  onAdd: () => void;
  onRename: (choiceId: number, label: string) => void;
  onRemove: (choiceId: number) => void;
}

function letterForIndex(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

export function ChoiceEditor({ choices, onAdd, onRename, onRemove }: ChoiceEditorProps) {
  // After "Add choice" the new box should take focus. We remember how many choices
  // there were when the button was pressed; the first box beyond that count is new.
  const [focusFromIndex, setFocusFromIndex] = useState<number | null>(null);

  function removeChoice(choiceId: number) {
    setFocusFromIndex(null);
    onRemove(choiceId);
  }

  function addChoice() {
    setFocusFromIndex(choices.length);
    onAdd();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {choices.map((choice, index) => (
        <div key={choice.id} className="group flex items-center gap-2">
          <div className="flex min-h-[38px] w-[256px] items-center gap-2 rounded-lg bg-form-answer-6 px-[10px] py-[4px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--form-answer)_10%,transparent)]">
            <span
              aria-hidden="true"
              className="flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-form-answer-24 bg-form-bg px-[6px] text-[12px] font-semibold leading-none text-form-answer"
            >
              {letterForIndex(index)}
            </span>
            <AutosaveText
              value={choice.label}
              onSave={(label) => onRename(choice.id, label)}
              placeholder="Choice"
              ariaLabel={`Choice ${letterForIndex(index)}`}
              autoFocus={focusFromIndex !== null && index >= focusFromIndex}
              // Enter adds the next choice, so a list can be typed without the mouse.
              onEnter={addChoice}
              onBackspaceWhenEmpty={choices.length > 1 ? () => removeChoice(choice.id) : undefined}
              className="px-1 font-form text-[18px] leading-[24px] text-form-answer placeholder:text-form-answer-40"
            />
          </div>
          <button
            type="button"
            aria-label={`Remove choice ${letterForIndex(index)}`}
            onClick={() => removeChoice(choice.id)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-form-answer-24 text-form-answer opacity-0 hover:bg-form-answer-6 focus:opacity-100 group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addChoice}
        className="mt-2 font-form text-[16px] leading-[22px] text-form-question-80 underline underline-offset-2"
      >
        Add choice
      </button>
    </div>
  );
}
