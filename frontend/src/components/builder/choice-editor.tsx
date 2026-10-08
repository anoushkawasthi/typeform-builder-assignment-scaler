"use client";

/**
 * choice-editor.tsx — editing the options of a multiple-choice or dropdown question.
 *
 * What it does:   shows each choice as an editable box with its letter key. Hovering a
 *                 choice reveals a drag handle on its left (to reorder) and round
 *                 buttons on its right (remove; open branching). "Add choice" is a link
 *                 underneath.
 * Depends on:     @dnd-kit (drag and drop), ui/autosave-text.tsx, lib/types.ts.
 * Depended on by: question-canvas.tsx.
 *
 * Each edit is its own request (add one, rename one, remove one, reorder). Sending the
 * whole list on every keystroke would let two quick edits overwrite each other.
 */

import { DndContext, type DragEndEvent, type Modifier, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GitBranch, GripVertical, X } from "lucide-react";
import { useState } from "react";

import { AutosaveText } from "@/components/ui/autosave-text";
import type { Choice } from "@/lib/types";

interface ChoiceEditorProps {
  choices: Choice[];
  onAdd: () => void;
  onRename: (choiceId: number, label: string) => void;
  onRemove: (choiceId: number) => void;
  onReorder: (choiceIds: number[]) => void;
  /** Open the Logic dialog, where a rule can be attached to a choice. */
  onOpenLogic: () => void;
}

// The canvas draws its content at this scale (see question-canvas.tsx).
const CANVAS_ZOOM = 0.75;

/**
 * dnd-kit measures how far the pointer moved in real screen pixels, but the dragged
 * choice lives inside the zoomed canvas, where one CSS pixel is only 0.75 of a screen
 * pixel. Without this correction the choice would trail behind the pointer.
 */
const compensateForCanvasZoom: Modifier = ({ transform }) => ({
  ...transform,
  y: transform.y / CANVAS_ZOOM,
});

function letterForIndex(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

const ROUND_BUTTON_CLASSES =
  "flex h-7 w-7 items-center justify-center rounded-full border border-form-answer-60 bg-form-bg text-form-answer hover:bg-form-answer-10";

export function ChoiceEditor({ choices, onAdd, onRename, onRemove, onReorder, onOpenLogic }: ChoiceEditorProps) {
  // After "Add choice" the new box should take focus. We remember how many choices
  // there were when the button was pressed; the first box beyond that count is new.
  const [focusFromIndex, setFocusFromIndex] = useState<number | null>(null);

  // A drag starts only after 5px of movement, so a click on the handle does nothing.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function removeChoice(choiceId: number) {
    setFocusFromIndex(null);
    onRemove(choiceId);
  }

  function addChoice() {
    setFocusFromIndex(choices.length);
    onAdd();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) {
      return;
    }
    const choiceIds = choices.map((choice) => choice.id);
    const oldIndex = choiceIds.indexOf(Number(active.id));
    const newIndex = choiceIds.indexOf(Number(over.id));
    onReorder(arrayMove(choiceIds, oldIndex, newIndex));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, compensateForCanvasZoom]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={choices.map((choice) => choice.id)} strategy={verticalListSortingStrategy}>
          {choices.map((choice, index) => (
            <ChoiceRow
              key={choice.id}
              choice={choice}
              letter={letterForIndex(index)}
              shouldFocus={focusFromIndex !== null && index >= focusFromIndex}
              canRemoveWithBackspace={choices.length > 1}
              onRename={(label) => onRename(choice.id, label)}
              onRemove={() => removeChoice(choice.id)}
              onAddNext={addChoice}
              onOpenLogic={onOpenLogic}
            />
          ))}
        </SortableContext>
      </DndContext>

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

interface ChoiceRowProps {
  choice: Choice;
  letter: string;
  shouldFocus: boolean;
  canRemoveWithBackspace: boolean;
  onRename: (label: string) => void;
  onRemove: () => void;
  onAddNext: () => void;
  onOpenLogic: () => void;
}

function ChoiceRow({
  choice,
  letter,
  shouldFocus,
  canRemoveWithBackspace,
  onRename,
  onRemove,
  onAddNext,
  onOpenLogic,
}: ChoiceRowProps) {
  // `setActivatorNodeRef` + `listeners` go on the handle only, so the text box inside
  // the row stays a normal text box: dragging starts from the handle, not from the label.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: choice.id,
  });

  // The controls appear on hover, while the row has focus, and while it is dragged.
  const controlVisibility = isDragging ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The negative margin makes room for the handle to the left of the box without
      // shifting the box itself out of line with the question title.
      className={"group relative -ml-11 flex items-center gap-3 pl-11 " + (isDragging ? "z-10" : "")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag choice ${letter} to reorder`}
        style={{ cursor: "grab" }}
        className={`absolute left-0 flex h-8 w-8 touch-none items-center justify-center rounded-lg border border-form-answer-60 bg-form-bg text-form-answer ${controlVisibility}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex min-h-[38px] w-[256px] items-center gap-2 rounded-lg bg-form-answer-6 px-[10px] py-[4px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--form-answer)_10%,transparent)]">
        <span
          aria-hidden="true"
          className="flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-form-answer-24 bg-form-bg px-[6px] text-[12px] font-semibold leading-none text-form-answer"
        >
          {letter}
        </span>
        <AutosaveText
          value={choice.label}
          onSave={onRename}
          placeholder="Choice"
          ariaLabel={`Choice ${letter}`}
          allowFormatting
          autoFocus={shouldFocus}
          // Enter adds the next choice, so a list can be typed without the mouse.
          onEnter={onAddNext}
          onBackspaceWhenEmpty={canRemoveWithBackspace ? onRemove : undefined}
          className="px-1 font-form text-[18px] leading-[24px] text-form-answer placeholder:text-form-answer-40"
        />
      </div>

      <div className={`flex items-center gap-1 ${controlVisibility}`}>
        <button type="button" aria-label={`Remove choice ${letter}`} title="Remove" onClick={onRemove} className={ROUND_BUTTON_CLASSES}>
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Add branching for choice ${letter}`}
          title="Add branching"
          onClick={onOpenLogic}
          className={ROUND_BUTTON_CLASSES}
        >
          <GitBranch className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
