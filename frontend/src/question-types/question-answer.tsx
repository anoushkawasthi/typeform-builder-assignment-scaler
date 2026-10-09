"use client";

/**
 * question-answer.tsx — picks the right answer control for a question.
 *
 * What it does:   looks at `question.type` and renders the matching component from this
 *                 folder. Also defines the props all of those components share.
 * Depends on:     the other files in src/question-types, lib/types.ts.
 * Depended on by: components/respondent/question-screen.tsx (the public form and the
 *                 preview) and components/builder/question-canvas.tsx (the builder).
 *
 * This folder is the reusable core of the app: the builder canvas, the preview and the
 * public form all draw a question through this one component, so they cannot disagree
 * about how a question looks.
 */

import type { AnswerValue, QuestionType, RenderableQuestion } from "@/lib/types";

import { ChoiceAnswer } from "./choice-answer";
import { DropdownAnswer } from "./dropdown-answer";
import { LongTextAnswer } from "./long-text-answer";
import { RatingAnswer } from "./rating-answer";
import { TextAnswer } from "./text-answer";

export interface QuestionAnswerProps {
  question: RenderableQuestion;
  /** The current answer, or undefined if there is none yet. */
  value: AnswerValue | undefined;
  /** Called with the new answer whenever the respondent changes it. */
  onChange: (value: AnswerValue) => void;
  /** Called when the answer is final and the form should move on (e.g. a choice was picked). */
  onCommit: () => void;
  /** True only for the question currently on screen: it takes focus and keyboard shortcuts. */
  isActive: boolean;
  /** False in the builder canvas, where the control is shown but cannot be used. */
  isInteractive: boolean;
}

// Yes/No is drawn as a two-option choice question with fixed keys Y and N. These ids
// never reach the server; the answer is stored as a boolean.
const YES_CHOICE_ID = 1;
const NO_CHOICE_ID = 0;

// The grey hint each type shows in an empty field, unless the creator wrote their own.
const DEFAULT_PLACEHOLDERS: Partial<Record<QuestionType, string>> = {
  short_text: "Type your answer here...",
  long_text: "Type your answer here...",
  email: "name@example.com",
  number: "Type your answer here...",
  dropdown: "Type or select an option",
};

/** The creator's "Custom placeholder text" if there is one, otherwise the usual hint. */
function placeholderFor(question: RenderableQuestion): string {
  // TEMPORARY `?? ""`: until the live API is updated it does not send this field.
  const customText = question.placeholder ?? "";
  if (customText !== "") {
    return customText;
  }
  return DEFAULT_PLACEHOLDERS[question.type] ?? "";
}

export function QuestionAnswer(props: QuestionAnswerProps) {
  const { question, value, onChange } = props;
  const placeholder = placeholderFor(question);

  switch (question.type) {
    case "short_text":
      return <TextAnswer {...props} inputType="text" placeholder={placeholder} />;

    case "email":
      return <TextAnswer {...props} inputType="email" placeholder={placeholder} />;

    case "number":
      return <TextAnswer {...props} inputType="number" placeholder={placeholder} />;

    case "long_text":
      return <LongTextAnswer {...props} placeholder={placeholder} />;

    case "multiple_choice":
      return (
        <ChoiceAnswer
          {...props}
          choices={question.choices}
          selectedIds={value?.choice_ids ?? []}
          allowMultiple={question.allow_multiple}
          isVertical={question.choices_vertical}
          onSelect={(choiceIds) => onChange({ choice_ids: choiceIds })}
        />
      );

    case "yes_no": {
      let selectedIds: number[] = [];
      if (value?.boolean === true) {
        selectedIds = [YES_CHOICE_ID];
      } else if (value?.boolean === false) {
        selectedIds = [NO_CHOICE_ID];
      }
      return (
        <ChoiceAnswer
          {...props}
          choices={[
            { id: YES_CHOICE_ID, label: "Yes" },
            { id: NO_CHOICE_ID, label: "No" },
          ]}
          keys={["Y", "N"]}
          selectedIds={selectedIds}
          allowMultiple={false}
          onSelect={(choiceIds) => onChange({ boolean: choiceIds[0] === YES_CHOICE_ID })}
        />
      );
    }

    case "dropdown":
      return <DropdownAnswer {...props} placeholder={placeholder} />;

    case "rating":
      return <RatingAnswer {...props} />;
  }
}
