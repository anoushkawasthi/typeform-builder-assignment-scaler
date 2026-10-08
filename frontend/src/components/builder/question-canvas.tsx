"use client";

/**
 * question-canvas.tsx — the builder's centre panel: the live preview you can type into.
 *
 * What it does:   draws the selected question exactly as a respondent will see it, in
 *                 the form's own theme, with the title, description and choices
 *                 editable in place. This is the "live preview" of the brief.
 * Depends on:     respondent/question-screen.tsx (the same component the public form
 *                 uses), canvas-frame.tsx (the frame and its scaling),
 *                 choice-editor.tsx, ui/autosave-text.tsx.
 * Depended on by: builder-screen.tsx.
 *
 * Because it renders through QuestionScreen, a change to how a question looks on the
 * public form shows up here automatically.
 */

import { AutosaveText } from "@/components/ui/autosave-text";
import { QuestionScreen } from "@/components/respondent/question-screen";
import { isChoiceType } from "@/lib/question-types";
import type { Question, QuestionUpdate, Theme } from "@/lib/types";

import { CanvasFrame, type CanvasDevice } from "./canvas-frame";
import { ChoiceEditor } from "./choice-editor";

interface QuestionCanvasProps {
  question: Question;
  /** 1 for the first question. */
  number: number;
  theme: Theme;
  device: CanvasDevice;
  isLastQuestion: boolean;
  onUpdate: (changes: QuestionUpdate) => void;
  onAddChoice: () => void;
  onRenameChoice: (choiceId: number, label: string) => void;
  onRemoveChoice: (choiceId: number) => void;
  onReorderChoices: (choiceIds: number[]) => void;
  onOpenLogic: () => void;
}

export function QuestionCanvas({
  question,
  number,
  theme,
  device,
  isLastQuestion,
  onUpdate,
  onAddChoice,
  onRenameChoice,
  onRemoveChoice,
  onReorderChoices,
  onOpenLogic,
}: QuestionCanvasProps) {
  return (
    // The frame and its scaling are shared with the welcome screen (canvas-frame.tsx).
    <CanvasFrame theme={theme} device={device}>
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
          hideButton
          titleContent={
            <AutosaveText
              value={question.title}
              onSave={(title) => onUpdate({ title })}
              placeholder="Your question here."
              ariaLabel="Question title"
              allowFormatting
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
              allowFormatting
              className="text-[16px] leading-[24px] text-form-question-80 placeholder:italic @2xl:text-[18px]"
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
                onReorder={onReorderChoices}
                onOpenLogic={onOpenLogic}
              />
            ) : undefined
          }
        />
    </CanvasFrame>
  );
}
