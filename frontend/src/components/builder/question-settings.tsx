"use client";

/**
 * question-settings.tsx — the builder's right panel: settings of the selected question.
 *
 * What it does:   the question-type picker, the Required toggle, the settings that
 *                 only some types have (multiple selection, number of stars), and the
 *                 button that opens the Logic dialog.
 * Depends on:     ui/toggle.tsx, ui/menu.tsx,
 *                 ui/question-type-chip.tsx, lib/question-types.ts.
 * Depended on by: builder-screen.tsx.
 */

import { ChevronDown, Plus } from "lucide-react";

import { Menu, MenuItem } from "@/components/ui/menu";
import { QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { Toggle } from "@/components/ui/toggle";
import { QUESTION_TYPES } from "@/lib/question-types";
import type { Question, QuestionType, QuestionUpdate } from "@/lib/types";

interface QuestionSettingsProps {
  question: Question;
  onUpdate: (changes: QuestionUpdate) => void;
  /** Open the Logic dialog on this question. */
  onOpenLogic: () => void;
}

const RATING_STEP_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

export function QuestionSettings({ question, onUpdate, onOpenLogic }: QuestionSettingsProps) {
  // The server refuses to change the type of a question that has answers (they are
  // stored per type), so the picker is locked up front with an explanation.
  const isTypeLocked = question.answer_count > 0;
  const allTypes = Object.keys(QUESTION_TYPES) as QuestionType[];

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      <section className="rounded-xl bg-admin-panel p-4">
        <h2 className="mb-3 font-medium text-admin-text">Answer</h2>

        <Menu
          align="start"
          trigger={
            <button
              type="button"
              disabled={isTypeLocked}
              className="flex h-8 w-full items-center gap-2 rounded-lg border border-admin-border bg-white/80 px-2 text-admin-muted disabled:opacity-60"
            >
              <QuestionTypeIcon type={question.type} />
              <span className="flex-1 text-left">{QUESTION_TYPES[question.type].label}</span>
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </button>
          }
        >
          {allTypes.map((type) => (
            <MenuItem key={type} onSelect={() => onUpdate({ type })}>
              <QuestionTypeIcon type={type} />
              {QUESTION_TYPES[type].label}
            </MenuItem>
          ))}
        </Menu>
        {isTypeLocked && (
          <p className="mt-2 text-[12px] leading-4 text-admin-muted">
            This question already has answers, so its type can&apos;t be changed.
          </p>
        )}
        {!isTypeLocked && question.logic_jumps.length > 0 && (
          <p className="mt-2 text-[12px] leading-4 text-admin-muted">Changing the type removes this question&apos;s logic.</p>
        )}

        <div className="mt-3 border-t border-admin-border-soft pt-2">
          <Toggle
            label="Required"
            isOn={question.is_required}
            onChange={(isRequired) => onUpdate({ is_required: isRequired })}
          />

          {question.type === "multiple_choice" && (
            <Toggle
              label="Multiple selection"
              isOn={question.allow_multiple}
              onChange={(allowMultiple) => onUpdate({ allow_multiple: allowMultiple })}
            />
          )}

          {question.type === "rating" && (
            <label className="flex h-10 items-center justify-between gap-3">
              <span className="text-admin-muted">Stars</span>
              <select
                value={question.rating_max}
                onChange={(event) => onUpdate({ rating_max: Number(event.target.value) })}
                className="h-8 rounded-lg border border-admin-border bg-white/80 px-2 text-admin-muted"
              >
                {RATING_STEP_OPTIONS.map((steps) => (
                  <option key={steps} value={steps}>
                    {steps}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {/* Like Typeform, the panel only opens the Logic dialog; rules are edited there. */}
      <section className="rounded-xl bg-admin-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-admin-text">Logic</h2>
          <button
            type="button"
            onClick={onOpenLogic}
            aria-label="Open logic"
            title="Add or edit logic"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-white/80 text-admin-muted hover:bg-admin-hover"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {question.logic_jumps.length > 0 && (
          <button type="button" onClick={onOpenLogic} className="mt-2 text-[13px] text-admin-muted underline underline-offset-2">
            {question.logic_jumps.length} branching {question.logic_jumps.length === 1 ? "rule" : "rules"}
          </button>
        )}
      </section>
    </aside>
  );
}
