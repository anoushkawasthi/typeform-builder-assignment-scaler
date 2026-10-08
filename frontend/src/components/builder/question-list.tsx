"use client";

/**
 * question-list.tsx — the builder's left panel: the ordered list of questions.
 *
 * What it does:   shows each question as a card (type chip, number, title), lets the
 *                 creator select one, drag cards to reorder them, and move, duplicate
 *                 or delete one from its "..." menu.
 * Depends on:     @dnd-kit (drag and drop), ui/question-type-chip.tsx, ui/menu.tsx.
 * Depended on by: builder-screen.tsx.
 *
 * How the drag-and-drop works, in dnd-kit's terms:
 *   - DndContext watches the pointer and keyboard and reports when a drag ends.
 *   - SortableContext is told the current order of ids.
 *   - Each card calls useSortable(id), which gives it the props that make it draggable
 *     and a transform to apply while cards shuffle out of the way.
 *   - When a drag ends we work out the new order and send it to the server.
 */

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  GitBranch,
  Lightbulb,
  MoreVertical,
  PanelLeftOpen,
  Plus,
  Trash2,
} from "lucide-react";

import { Menu, MenuItem } from "@/components/ui/menu";
import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import { stripFormatting } from "@/lib/formatted-text";
import type { Question } from "@/lib/types";

interface QuestionListProps {
  questions: Question[];
  selectedQuestionId: number | null;
  onSelect: (questionId: number) => void;
  onReorder: (questionIds: number[]) => void;
  onDuplicate: (question: Question) => void;
  onDelete: (question: Question) => void;
  onAddClick: () => void;
  /** Open the Logic dialog (the branching shortcut under the list). */
  onOpenLogic: () => void;
  /** The welcome screen's title if the form has one, or null if it has none. */
  welcomeTitle: string | null;
  isWelcomeSelected: boolean;
  onSelectWelcome: () => void;
  onAddWelcome: () => void;
}

export function QuestionList({
  questions,
  selectedQuestionId,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onAddClick,
  onOpenLogic,
  welcomeTitle,
  isWelcomeSelected,
  onSelectWelcome,
  onAddWelcome,
}: QuestionListProps) {
  const sensors = useSensors(
    // A drag only starts after the pointer moves 5px, so a plain click still selects.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard users can reorder too: Space to pick up, arrows to move, Space to drop.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // `over` is null when the card is dropped outside the list.
    if (over === null || active.id === over.id) {
      return;
    }
    const questionIds = questions.map((question) => question.id);
    const oldIndex = questionIds.indexOf(Number(active.id));
    const newIndex = questionIds.indexOf(Number(over.id));
    onReorder(arrayMove(questionIds, oldIndex, newIndex));
  }

  /** Move a question one place up (-1) or down (+1). Used by the "..." menu. */
  function moveQuestion(index: number, offset: -1 | 1) {
    const questionIds = questions.map((question) => question.id);
    onReorder(arrayMove(questionIds, index, index + offset));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-admin-panel">
      <h2 className="px-5 pb-3 pt-5 font-medium text-[#262627]">Questions</h2>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {/* The welcome screen always comes first and cannot be dragged. */}
        {welcomeTitle !== null && (
          <button
            type="button"
            onClick={onSelectWelcome}
            aria-pressed={isWelcomeSelected}
            className={
              "flex min-h-12 w-full shrink-0 items-center gap-3 rounded-lg px-2 py-2 text-left " +
              (isWelcomeSelected ? "bg-admin-hover" : "hover:bg-admin-hover")
            }
          >
            <span className="flex h-6 w-12 shrink-0 items-center justify-center rounded-[6px] bg-[#DEDCDE] text-admin-text">
              <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="line-clamp-2 flex-1 text-[13px] leading-[17px] text-admin-text">
              {stripFormatting(welcomeTitle)}
            </span>
          </button>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          // Two limits on where a dragged card may go. Vertical only: the list is one
          // column. Inside the list only: without this a card could be dragged below
          // the last one for ever, and the list kept growing and scrolling to follow it.
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                number={index + 1}
                isSelected={question.id === selectedQuestionId}
                canMoveUp={index > 0}
                canMoveDown={index < questions.length - 1}
                onSelect={() => onSelect(question.id)}
                onMoveUp={() => moveQuestion(index, -1)}
                onMoveDown={() => moveQuestion(index, 1)}
                onDuplicate={() => onDuplicate(question)}
                onDelete={() => onDelete(question)}
                onAddClick={onAddClick}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* With no questions there is no selected card to hold the add row. */}
        {questions.length === 0 && (
          <button
            type="button"
            onClick={onAddClick}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-admin-border text-[13px] font-medium text-admin-muted hover:bg-admin-hover"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add content
          </button>
        )}
      </div>

      {/* Offered until the form has a welcome screen, as in Typeform. */}
      {welcomeTitle === null && (
        <button
          type="button"
          onClick={onAddWelcome}
          className="mx-3 mb-2 flex shrink-0 items-center gap-3 rounded-xl border border-dashed border-admin-border px-3 py-2 text-left text-admin-text hover:bg-admin-hover"
        >
          <Lightbulb aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-[13px] leading-[17px]">Add Welcome Screen</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-admin-border bg-white/80">
            <Plus aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
      )}

      {/* Typeform's shortcut to its logic features: opens the Logic dialog. */}
      {questions.length > 1 && (
        <button
          type="button"
          onClick={onOpenLogic}
          className="mx-3 mb-3 flex shrink-0 items-center gap-3 rounded-xl border border-dashed border-admin-border px-3 py-3 text-left text-admin-text hover:bg-admin-hover"
        >
          <GitBranch aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-[13px] leading-[17px]">Personalize with branching</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-admin-border bg-white/80">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </button>
      )}
    </section>
  );
}

interface QuestionCardProps {
  question: Question;
  number: number;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddClick: () => void;
}

function QuestionCard({
  question,
  number,
  isSelected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAddClick,
}: QuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={
        // Typeform's cards are outlines on the panel, not white tiles.
        "group relative shrink-0 rounded-xl border border-admin-border bg-admin-panel p-1 " +
        // The card being dragged floats above the others with a shadow.
        (isDragging ? "z-10 shadow-[0_8px_24px_rgba(60,50,62,0.18)]" : "")
      }
    >
      {/* The whole card is the drag handle and the select button at once. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onSelect}
        aria-pressed={isSelected}
        className={
          "flex min-h-12 w-full cursor-grab items-center gap-3 rounded-lg px-1 py-2 pr-9 text-left active:cursor-grabbing " +
          (isSelected ? "bg-admin-hover" : "hover:bg-admin-hover")
        }
      >
        <QuestionTypeChip type={question.type} number={number} />
        <span className="line-clamp-2 flex-1 text-[13px] leading-[17px] text-admin-text">
          {stripFormatting(question.title)}
        </span>
      </button>

      <div className="absolute right-2 top-[14px] opacity-0 focus-within:opacity-100 group-hover:opacity-100">
        <Menu
          // Opens beside the card, as in Typeform, so it never covers the list.
          side="right"
          align="start"
          trigger={
            <button
              type="button"
              aria-label={`Options for question ${number}`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-admin-muted hover:bg-admin-hover"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <MenuItem onSelect={onMoveUp} disabled={!canMoveUp}>
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
            Move up
          </MenuItem>
          <MenuItem onSelect={onMoveDown} disabled={!canMoveDown}>
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
            Move down
          </MenuItem>
          <MenuItem onSelect={onDuplicate}>
            <CopyPlus aria-hidden="true" className="h-4 w-4" />
            Duplicate
          </MenuItem>
          <MenuItem onSelect={onDelete} isDanger>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </MenuItem>
        </Menu>
      </div>

      {/* Typeform shows "Add content" inside the selected card: new questions go after it. */}
      {isSelected && (
        <button
          type="button"
          onClick={onAddClick}
          className="mt-1 flex h-9 w-full items-center justify-center gap-2 border-t border-admin-border-soft text-[13px] font-medium text-admin-muted hover:bg-admin-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add content
        </button>
      )}
    </div>
  );
}
