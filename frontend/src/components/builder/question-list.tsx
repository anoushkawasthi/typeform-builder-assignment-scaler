"use client";

/**
 * question-list.tsx — the builder's left panel: the ordered list of questions.
 *
 * What it does:   shows each question as a card (type chip, number, title), lets the
 *                 creator select one, drag cards to reorder them, and delete one from
 *                 its "..." menu.
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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Menu, MenuItem } from "@/components/ui/menu";
import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import type { Question } from "@/lib/types";

interface QuestionListProps {
  questions: Question[];
  selectedQuestionId: number | null;
  onSelect: (questionId: number) => void;
  onReorder: (questionIds: number[]) => void;
  onDelete: (question: Question) => void;
  onAddClick: () => void;
}

export function QuestionList({
  questions,
  selectedQuestionId,
  onSelect,
  onReorder,
  onDelete,
  onAddClick,
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

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-admin-panel">
      <h2 className="px-5 pb-3 pt-5 font-medium text-[#262627]">Questions</h2>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                number={index + 1}
                isSelected={question.id === selectedQuestionId}
                onSelect={() => onSelect(question.id)}
                onDelete={() => onDelete(question)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={onAddClick}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-admin-border text-[13px] font-medium text-admin-muted hover:bg-admin-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add content
        </button>
      </div>
    </section>
  );
}

interface QuestionCardProps {
  question: Question;
  number: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function QuestionCard({ question, number, isSelected, onSelect, onDelete }: QuestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={
        "group relative shrink-0 rounded-xl border border-admin-border-soft bg-white p-1 " +
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
          {question.title === "" ? <span className="text-admin-muted">...</span> : question.title}
        </span>
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
        <Menu
          trigger={
            <button
              type="button"
              aria-label={`Options for question ${number}`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-admin-muted hover:bg-admin-hover"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          <MenuItem onSelect={onDelete} isDanger>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}
