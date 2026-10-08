/**
 * question-types.ts — what the app knows about each question type.
 *
 * What it does:   one table listing every type's display name, colour group and icon,
 *                 plus the groups shown in the "Add content" dialog.
 * Depends on:     lib/types.ts, lucide-react (icons).
 * Depended on by: components/ui/question-type-chip.tsx, the builder's add-question
 *                 dialog and type select, and the results pages.
 *
 * Why a table: adding a ninth type means adding one row here and one renderer in
 * src/question-types, instead of editing `if` chains spread across the app.
 */

import {
  AlignLeft,
  ChevronDown,
  CircleSlash,
  CreditCard,
  Hash,
  ListChecks,
  type LucideIcon,
  Mail,
  Minus,
  Star,
  Upload,
} from "lucide-react";

import type { QuestionType } from "./types";

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  /** Pastel tile colour. Typeform colours types by group; see docs/03-design-system. */
  color: string;
  icon: LucideIcon;
}

const COLOR_TEXT = "#BDDDF9";
const COLOR_CHOICE = "#DDD6FA";
const COLOR_CONTACT = "#F8CDD8";
const COLOR_NUMBER = "#FBE19D";
const COLOR_RATING = "#C4E3BA";

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeInfo> = {
  short_text: { type: "short_text", label: "Short Text", color: COLOR_TEXT, icon: Minus },
  long_text: { type: "long_text", label: "Long Text", color: COLOR_TEXT, icon: AlignLeft },
  multiple_choice: { type: "multiple_choice", label: "Multiple Choice", color: COLOR_CHOICE, icon: ListChecks },
  dropdown: { type: "dropdown", label: "Dropdown", color: COLOR_CHOICE, icon: ChevronDown },
  yes_no: { type: "yes_no", label: "Yes/No", color: COLOR_CHOICE, icon: CircleSlash },
  email: { type: "email", label: "Email", color: COLOR_CONTACT, icon: Mail },
  number: { type: "number", label: "Number", color: COLOR_NUMBER, icon: Hash },
  rating: { type: "rating", label: "Rating", color: COLOR_RATING, icon: Star },
};

/** The groups of the "Add content" dialog, in Typeform's order. */
export const QUESTION_TYPE_GROUPS: { title: string; types: QuestionType[] }[] = [
  { title: "Contact info", types: ["email"] },
  { title: "Choice", types: ["multiple_choice", "dropdown", "yes_no"] },
  { title: "Rating & ranking", types: ["rating"] },
  { title: "Text", types: ["long_text", "short_text"] },
  { title: "Other", types: ["number"] },
];

/** Types the brief lists as placeholders. Shown greyed out with a "Coming soon" tag. */
export const COMING_SOON_TYPES: { label: string; color: string; icon: LucideIcon }[] = [
  { label: "Payment", color: COLOR_NUMBER, icon: CreditCard },
  { label: "File Upload", color: COLOR_NUMBER, icon: Upload },
];

export function isChoiceType(type: QuestionType): boolean {
  return type === "multiple_choice" || type === "dropdown";
}
