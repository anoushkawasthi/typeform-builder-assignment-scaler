"use client";

/**
 * question-settings.tsx — the builder's right panel: settings of the selected question.
 *
 * What it does:   the Text / Video switch (video is a placeholder), the question-type
 *                 picker, the Required toggle, the settings that only some types have
 *                 (multiple selection, random order and side-by-side layout of
 *                 choices, a custom placeholder, the number and shape of rating
 *                 steps), a placeholder for adding media, and at the bottom the button
 *                 that opens the Logic dialog.
 * Depends on:     ui/toggle.tsx, ui/menu.tsx, ui/question-type-chip.tsx,
 *                 lib/question-types.ts, question-types/rating-shapes.tsx, sonner.
 * Depended on by: builder-screen.tsx.
 */

import { ChevronDown, Minus, Plus, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Menu, MenuIconItem, MenuItem } from "@/components/ui/menu";
import { QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { Toggle } from "@/components/ui/toggle";
import { QUESTION_TYPES } from "@/lib/question-types";
import type { Question, QuestionType, QuestionUpdate, RatingShape } from "@/lib/types";
import { RATING_SHAPES } from "@/question-types/rating-shapes";

interface QuestionSettingsProps {
  question: Question;
  onUpdate: (changes: QuestionUpdate) => void;
  /** Open the Logic dialog on this question. */
  onOpenLogic: () => void;
}

const RATING_STEP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Which types have which of the settings that only change how a question is drawn.
const RANDOMIZE_TYPES: QuestionType[] = ["multiple_choice", "dropdown"];
const PLACEHOLDER_TYPES: QuestionType[] = ["short_text", "long_text", "email", "number", "dropdown"];

// The look shared by the two rating pickers, which are buttons that open a menu.
const PICKER_BUTTON_CLASSES =
  "flex h-8 items-center justify-between rounded-lg border border-admin-border bg-white/80 px-3 text-admin-muted";

export function QuestionSettings({ question, onUpdate, onOpenLogic }: QuestionSettingsProps) {
  // The server refuses to change the type of a question that has answers (they are
  // stored per type), so the picker is locked up front with an explanation.
  const isTypeLocked = question.answer_count > 0;
  const allTypes = Object.keys(QUESTION_TYPES) as QuestionType[];

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      {/* Typeform lets a question be asked as text or as a recorded video. Video is
          outside the brief, so that half only says so. */}
      <section className="shrink-0 rounded-xl bg-admin-panel px-4 pb-3 pt-4">
        <h2 className="mb-4 font-medium text-admin-text">Question</h2>
        <div className="flex h-8 rounded-lg bg-admin-hover p-[1px]">
          <span className="flex flex-1 items-center justify-center gap-2 rounded-[7px] bg-white/80 text-admin-active shadow-[0_0_0_1px_var(--color-admin-border)]">
            <Minus aria-hidden="true" className="h-4 w-4" />
            Text
          </span>
          <button
            type="button"
            onClick={() => toast("Video questions are coming soon")}
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] text-admin-muted hover:text-admin-text"
          >
            <Video aria-hidden="true" className="h-4 w-4" />
            Video
          </button>
        </div>
      </section>

      {/* This panel takes the spare height, which pushes Logic to the bottom of the
          column, where Typeform keeps it. */}
      <section className="flex-1 rounded-xl bg-admin-panel p-4">
        <h2 className="mb-4 font-medium text-admin-text">Answer</h2>

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

          {RANDOMIZE_TYPES.includes(question.type) && (
            <Toggle
              label="Randomize"
              isOn={question.randomize_choices}
              onChange={(randomizeChoices) => onUpdate({ randomize_choices: randomizeChoices })}
            />
          )}

          {question.type === "multiple_choice" && (
            <Toggle
              label="Vertical alignment"
              isOn={question.choices_vertical}
              onChange={(choicesVertical) => onUpdate({ choices_vertical: choicesVertical })}
            />
          )}

          {PLACEHOLDER_TYPES.includes(question.type) && (
            // A new key per question: the switch must not stay on when another question is selected.
            <PlaceholderSetting key={question.id} question={question} onUpdate={onUpdate} />
          )}

          {question.type === "rating" && <RatingPickers question={question} onUpdate={onUpdate} />}
        </div>

        {/* Pictures and video beside a question are outside the brief (file handling). */}
        <div className="mt-2 flex items-center justify-between border-y border-admin-border-soft py-4">
          <span className="font-medium text-admin-text">Image or video</span>
          <button
            type="button"
            aria-label="Add image or video"
            title="Add image or video"
            onClick={() => toast("Images and video are coming soon")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-white/80 text-admin-muted hover:bg-admin-hover"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Like Typeform, the panel only opens the Logic dialog; rules are edited there. */}
      <section className="shrink-0 rounded-xl bg-admin-panel px-4 py-2">
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
          <button type="button" onClick={onOpenLogic} className="mb-1 mt-1 text-[13px] text-admin-muted underline underline-offset-2">
            {question.logic_jumps.length} branching {question.logic_jumps.length === 1 ? "rule" : "rules"}
          </button>
        )}
      </section>
    </aside>
  );
}

interface SettingProps {
  question: Question;
  onUpdate: (changes: QuestionUpdate) => void;
}

/**
 * "Custom placeholder text": a switch, and while it is on a box for the text. The text
 * is saved when the box is left; switching off removes it, so the field goes back to
 * its usual hint.
 */
function PlaceholderSetting({ question, onUpdate }: SettingProps) {
  // On when there is saved text. Kept here as well as on the server because the switch
  // can be on while the box is still empty, and an empty text is not saved as "on".
  // TEMPORARY `?? ""`: until the live API is updated it does not send this field.
  const [isOn, setIsOn] = useState((question.placeholder ?? "") !== "");

  function handleToggle(nextIsOn: boolean) {
    setIsOn(nextIsOn);
    if (!nextIsOn && question.placeholder !== "") {
      onUpdate({ placeholder: "" });
    }
  }

  return (
    <>
      <Toggle
        label="Custom placeholder text"
        hint="Set the helper text that appears before someone answers."
        isOn={isOn}
        onChange={handleToggle}
      />
      {isOn && (
        <input
          // `key` restarts the box if the saved text changes from elsewhere.
          key={question.placeholder}
          type="text"
          aria-label="Placeholder text"
          defaultValue={question.placeholder}
          maxLength={255}
          onBlur={(event) => {
            const text = event.target.value.trim();
            if (text !== question.placeholder) {
              onUpdate({ placeholder: text });
            }
          }}
          onKeyDown={(event) => {
            // Enter finishes editing, which saves through onBlur above.
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="my-[10px] h-8 w-full rounded-lg border border-admin-border bg-white/80 px-3 text-admin-text outline-none focus:border-admin-text"
        />
      )}
    </>
  );
}

/** The two pickers of a rating question: how many steps, and which shape they are. */
function RatingPickers({ question, onUpdate }: SettingProps) {
  // An unknown shape shows as the star, the same fallback the form itself uses.
  const CurrentShapeIcon = (RATING_SHAPES[question.rating_shape] ?? RATING_SHAPES.star).icon;
  const allShapes = Object.keys(RATING_SHAPES) as RatingShape[];

  return (
    <div className="flex h-10 items-center gap-2">
      <Menu
        align="start"
        sizeClassName="w-[100px] p-2"
        trigger={
          <button type="button" aria-label="Number of steps" className={`${PICKER_BUTTON_CLASSES} w-[100px]`}>
            {question.rating_max}
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
        }
      >
        {RATING_STEP_OPTIONS.map((steps) => (
          <MenuItem key={steps} isSelected={steps === question.rating_max} onSelect={() => onUpdate({ rating_max: steps })}>
            {steps}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        align="end"
        sizeClassName="w-[290px] p-5"
        trigger={
          <button type="button" aria-label="Shape" className={`${PICKER_BUTTON_CLASSES} flex-1`}>
            <CurrentShapeIcon aria-hidden="true" strokeWidth={1.5} className="h-6 w-6" />
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
        }
      >
        {/* Five to a row, as in Typeform's picker. */}
        <div className="grid grid-cols-5 gap-3">
          {allShapes.map((shape) => {
            const ShapeIcon = RATING_SHAPES[shape].icon;
            return (
              <MenuIconItem
                key={shape}
                label={RATING_SHAPES[shape].label}
                isSelected={shape === question.rating_shape}
                onSelect={() => onUpdate({ rating_shape: shape })}
              >
                <ShapeIcon aria-hidden="true" strokeWidth={1.25} className="h-8 w-8" />
              </MenuIconItem>
            );
          })}
        </div>
      </Menu>
    </div>
  );
}
