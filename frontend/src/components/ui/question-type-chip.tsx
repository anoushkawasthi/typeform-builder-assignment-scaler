/**
 * question-type-chip.tsx — the coloured marker for a question type.
 *
 * What it does:   `QuestionTypeIcon` is the 24px pastel tile with the type's icon;
 *                 `QuestionTypeChip` is the wider pill that also shows the question
 *                 number. Typeform repeats these everywhere a question is mentioned.
 * Depends on:     lib/question-types.ts.
 * Depended on by: builder (question list, add dialog, type select), results pages.
 */

import type { LucideIcon } from "lucide-react";

import { QUESTION_TYPES } from "@/lib/question-types";
import type { QuestionType } from "@/lib/types";

interface IconTileProps {
  color: string;
  icon: LucideIcon;
}

/** A bare tile, for things that are not one of the eight types (e.g. "Payment"). */
export function IconTile({ color, icon: Icon }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-admin-text"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

export function QuestionTypeIcon({ type }: { type: QuestionType }) {
  const info = QUESTION_TYPES[type];
  return <IconTile color={info.color} icon={info.icon} />;
}

export function QuestionTypeChip({ type, number }: { type: QuestionType; number: number }) {
  const info = QUESTION_TYPES[type];
  const Icon = info.icon;
  return (
    <span
      className="flex h-6 w-12 shrink-0 items-center justify-between rounded-[6px] px-[6px] text-[12px] text-admin-text"
      style={{ backgroundColor: info.color }}
      title={info.label}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      {number}
    </span>
  );
}
