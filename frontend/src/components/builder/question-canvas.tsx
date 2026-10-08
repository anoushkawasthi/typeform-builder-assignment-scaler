"use client";

/**
 * question-canvas.tsx — the builder's centre panel: the live preview you can type into.
 *
 * What it does:   draws the selected question exactly as a respondent will see it, in
 *                 the form's own theme, with the title, description and choices
 *                 editable in place. This is the "live preview" of the brief.
 * Depends on:     respondent/question-screen.tsx and respondent/form-theme.tsx (the same
 *                 components the public form uses), choice-editor.tsx,
 *                 ui/autosave-text.tsx.
 * Depended on by: builder-screen.tsx.
 *
 * Because it renders through QuestionScreen, a change to how a question looks on the
 * public form shows up here automatically.
 */

import { AutosaveText } from "@/components/ui/autosave-text";
import { FormTheme } from "@/components/respondent/form-theme";
import { QuestionScreen } from "@/components/respondent/question-screen";
import { isChoiceType } from "@/lib/question-types";
import type { Question, QuestionUpdate, Theme } from "@/lib/types";

import { ChoiceEditor } from "./choice-editor";

interface QuestionCanvasProps {
  question: Question;
  /** 1 for the first question. */
  number: number;
  theme: Theme;
  isLastQuestion: boolean;
  onUpdate: (changes: QuestionUpdate) => void;
  onAddChoice: () => void;
  onRenameChoice: (choiceId: number, label: string) => void;
  onRemoveChoice: (choiceId: number) => void;
}

export function QuestionCanvas({
  question,
  number,
  theme,
  isLastQuestion,
  onUpdate,
  onAddChoice,
  onRenameChoice,
  onRemoveChoice,
}: QuestionCanvasProps) {
  return (
    <FormTheme
      theme={theme}
      className="flex min-h-full items-center justify-center rounded-lg border border-admin-border-soft px-6 py-16 sm:px-20"
    >
      <div className="w-full max-w-[720px]">
        <QuestionScreen
          // A new key per question gives each one fresh text boxes, so text typed in one
          // question can never show up in another when the selection changes.
          key={question.id}
          question={question}
          number={number}
          value={undefined}
          onChange={() => {}}
          onCommit={() => {}}
          isActive={false}
          isInteractive={false}
          isLastQuestion={isLastQuestion}
          titleContent={
            <AutosaveText
              value={question.title}
              onSave={(title) => onUpdate({ title })}
              placeholder="Your question here."
              ariaLabel="Question title"
              className="text-form-question placeholder:italic placeholder:text-form-question-80"
            />
          }
          descriptionContent={
            <AutosaveText
              value={question.description}
              onSave={(description) => onUpdate({ description })}
              placeholder="Description (optional)"
              ariaLabel="Question description"
              allowLineBreaks
              className="mt-2 text-[16px] leading-[24px] text-form-question-80 placeholder:italic sm:text-[18px]"
            />
          }
          // Choice questions swap the answer for an editor; every other type shows the
          // real (but inactive) answer control.
          answerContent={
            isChoiceType(question.type) ? (
              <ChoiceEditor
                choices={question.choices}
                onAdd={onAddChoice}
                onRename={onRenameChoice}
                onRemove={onRemoveChoice}
              />
            ) : undefined
          }
        />
      </div>
    </FormTheme>
  );
}
