"use client";

/**
 * builder-screen.tsx — the form builder page. Start here when reading the builder.
 *
 * What it does:   lays out the three columns (question list, canvas, settings) under the
 *                 header and toolbar, remembers which question is selected, and connects
 *                 every panel to `useFormEditor`, which does the saving.
 * Depends on:     use-form-editor.ts and the other files in components/builder,
 *                 ui/form-header.tsx, lib/api.ts (address of the responses download).
 * Depended on by: app/forms/[id]/create/page.tsx.
 *
 * This component holds only "which thing is open or selected" state. The form itself
 * lives in the query cache (see use-form-editor.ts) and each panel is a separate
 * component that receives what it needs as props.
 */

import { Palette, Play, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Modal, ModalActions } from "@/components/ui/modal";
import { responsesExportUrl } from "@/lib/api";
import type { Question, QuestionType } from "@/lib/types";

import { AddQuestionDialog } from "./add-question-dialog";
import { DesignPanel } from "./design-panel";
import { EndingDialog } from "./ending-dialog";
import { LogicDialog } from "./logic-dialog";
import { PreviewOverlay } from "./preview-overlay";
import { PublishButton } from "./publish-button";
import { QuestionCanvas } from "./question-canvas";
import { QuestionList } from "./question-list";
import { QuestionSettings } from "./question-settings";
import { useFormEditor } from "./use-form-editor";
import { WelcomeCanvas } from "./welcome-canvas";
import { WelcomeSettings } from "./welcome-settings";

export function BuilderScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const form = editor.form;

  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  // True while the welcome screen (not a question) is what the canvas shows.
  const [isWelcomeSelected, setIsWelcomeSelected] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDesignOpen, setIsDesignOpen] = useState(false);
  const [isEndingOpen, setIsEndingOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLogicOpen, setIsLogicOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  if (editor.isLoading) {
    return <p className="p-8 text-admin-muted">Loading form...</p>;
  }
  if (form === undefined) {
    return (
      <div className="p-8">
        <p className="text-admin-text">This form could not be found.</p>
        <Link href="/" className="mt-2 inline-block underline">
          Back to forms
        </Link>
      </div>
    );
  }

  const questions = form.questions;
  // Fall back to the first question when nothing is selected, or when the selected
  // question no longer exists (for example, it was just deleted).
  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) ?? questions[0];
  const selectedIndex = selectedQuestion === undefined ? -1 : questions.indexOf(selectedQuestion);

  // The welcome screen can only be shown while the form actually has one.
  const showsWelcome = isWelcomeSelected && form.welcome_enabled;

  function selectQuestion(questionId: number) {
    setIsWelcomeSelected(false);
    setSelectedQuestionId(questionId);
  }

  function addWelcomeScreen() {
    setIsAddDialogOpen(false);
    editor.updateForm({ welcome_enabled: true });
    setIsWelcomeSelected(true);
  }

  function removeWelcomeScreen() {
    editor.updateForm({ welcome_enabled: false });
    setIsWelcomeSelected(false);
    toast.success("Welcome screen removed");
  }

  async function handleAddQuestion(type: QuestionType) {
    setIsAddDialogOpen(false);
    const existingIds = questions.map((question) => question.id);
    // New questions go right after the selected one, like in Typeform.
    const position = selectedIndex === -1 ? undefined : selectedIndex + 1;
    try {
      const updatedForm = await editor.addQuestion(type, position);
      const newQuestion = updatedForm.questions.find((question) => !existingIds.includes(question.id));
      if (newQuestion !== undefined) {
        selectQuestion(newQuestion.id);
      }
    } catch {
      // The editor already showed the error in a toast.
    }
  }

  async function duplicateQuestion(question: Question) {
    const existingIds = questions.map((item) => item.id);
    try {
      const updatedForm = await editor.duplicateQuestion(question.id);
      const copy = updatedForm.questions.find((item) => !existingIds.includes(item.id));
      if (copy !== undefined) {
        selectQuestion(copy.id);
      }
    } catch {
      // The editor already showed the error in a toast.
    }
  }

  function requestDelete(question: Question) {
    // Only ask for confirmation when there is something to lose.
    if (question.answer_count > 0) {
      setQuestionToDelete(question);
    } else {
      void deleteQuestion(question);
    }
  }

  async function deleteQuestion(question: Question) {
    setQuestionToDelete(null);
    try {
      await editor.deleteQuestion(question.id);
      toast.success("Question deleted");
    } catch {
      // The editor already showed the error in a toast.
    }
  }

  return (
    <div className="flex h-dvh min-w-[1024px] flex-col overflow-hidden">
      <FormHeader
        formId={form.id}
        formTitle={form.title}
        activeSection="create"
        hasBeenPublished={form.published_at !== null}
        onRename={(title) => editor.updateForm({ title })}
        actions={
          <>
            <span className="text-[13px] text-admin-muted" aria-live="polite">
              {editor.isSaving ? "Saving..." : "Saved"}
            </span>
            <PublishButton form={form} editor={editor} />
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-[256px_minmax(0,1fr)_256px] gap-4 px-4 pb-4">
        {/* Left column: the questions, then the ending. */}
        <div className="flex min-h-0 flex-col gap-3">
          <QuestionList
            questions={questions}
            selectedQuestionId={showsWelcome ? null : (selectedQuestion?.id ?? null)}
            onSelect={selectQuestion}
            welcomeTitle={form.welcome_enabled ? form.welcome_title : null}
            isWelcomeSelected={showsWelcome}
            onSelectWelcome={() => setIsWelcomeSelected(true)}
            onAddWelcome={addWelcomeScreen}
            onReorder={editor.reorderQuestions}
            onDuplicate={(question) => void duplicateQuestion(question)}
            onDelete={requestDelete}
            onAddClick={() => setIsAddDialogOpen(true)}
            onOpenLogic={() => setIsLogicOpen(true)}
          />
          <section className="shrink-0 rounded-xl bg-admin-panel p-3">
            <h2 className="px-2 pb-2 pt-1 font-medium text-[#262627]">Endings</h2>
            <button
              type="button"
              onClick={() => setIsEndingOpen(true)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-admin-border-soft bg-white px-2 py-2 text-left hover:bg-admin-hover"
            >
              <span className="flex h-6 w-12 shrink-0 items-center justify-center rounded-[6px] bg-[#DEDCDE] text-[12px] text-admin-text">
                End
              </span>
              <span className="line-clamp-2 text-[13px] leading-[17px] text-admin-text">{form.thank_you_title}</span>
            </button>
          </section>
        </div>

        {/* Centre column: toolbar, then the canvas. */}
        <div className="flex min-h-0 flex-col gap-3">
          {/* `relative` so the Design panel can float just below the toolbar. */}
          <div className="relative flex h-12 shrink-0 items-center gap-1 rounded-xl bg-admin-panel px-2">
            <Button variant="primary" onClick={() => setIsAddDialogOpen(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add content
            </Button>
            <span className="mx-2 h-4 w-px bg-admin-border" />
            <Button
              variant="ghost"
              aria-expanded={isDesignOpen}
              className={isDesignOpen ? "bg-admin-hover" : ""}
              onClick={() => setIsDesignOpen(!isDesignOpen)}
            >
              <Palette aria-hidden="true" className="h-4 w-4" />
              Design
            </Button>
            <span className="mx-2 h-4 w-px bg-admin-border" />
            {/* Icon-only, like Typeform's toolbar. Preview opens over the builder, in the
                same tab. */}
            <Button
              variant="ghost"
              iconOnly
              aria-label="Preview"
              title="Preview"
              disabled={questions.length === 0}
              onClick={() => setIsPreviewOpen(true)}
            >
              <Play aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              iconOnly
              aria-label="Form settings"
              title="Form settings"
              onClick={() => setIsEndingOpen(true)}
            >
              <Settings aria-hidden="true" className="h-4 w-4" />
            </Button>

            {isDesignOpen && <DesignPanel form={form} onUpdate={editor.updateForm} onClose={() => setIsDesignOpen(false)} />}
          </div>

          {/* The work area. The canvas is centred in it. Typeform keeps a 70px strip
              under the canvas for its AI chat box; we leave the same strip empty so the
              canvas sits at the same height. `-mt-3` cancels the column's gap: Typeform's
              work area starts right under the toolbar. */}
          <div className="-mt-3 flex min-h-0 flex-1 flex-col justify-center overflow-y-auto pb-[70px]">
            {showsWelcome ? (
              <WelcomeCanvas form={form} onUpdate={editor.updateForm} />
            ) : selectedQuestion === undefined ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl bg-admin-panel text-center">
                <h2 className="text-[21px] leading-7 text-admin-text">Add your first question</h2>
                <p className="mt-2 text-admin-muted">Pick a question type to start building this form.</p>
                <Button variant="primary" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add content
                </Button>
              </div>
            ) : (
              <QuestionCanvas
                question={selectedQuestion}
                number={selectedIndex + 1}
                theme={form.theme}
                isLastQuestion={selectedIndex === questions.length - 1}
                onUpdate={(changes) => editor.updateQuestion(selectedQuestion.id, changes)}
                onAddChoice={() => editor.addChoice(selectedQuestion.id)}
                onRenameChoice={editor.renameChoice}
                onRemoveChoice={editor.deleteChoice}
                onReorderChoices={(choiceIds) => editor.reorderChoices(selectedQuestion.id, choiceIds)}
                onOpenLogic={() => setIsLogicOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Right column: settings of the selected question. */}
        {showsWelcome ? (
          <WelcomeSettings form={form} onUpdate={editor.updateForm} onRemove={removeWelcomeScreen} />
        ) : selectedQuestion === undefined ? (
          <aside className="rounded-xl bg-admin-panel p-4 text-admin-muted">Question settings appear here.</aside>
        ) : (
          <QuestionSettings
            question={selectedQuestion}
            onUpdate={(changes) => editor.updateQuestion(selectedQuestion.id, changes)}
            onOpenLogic={() => setIsLogicOpen(true)}
          />
        )}
      </div>

      <AddQuestionDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onPick={handleAddQuestion}
        onPickWelcome={form.welcome_enabled ? undefined : addWelcomeScreen}
      />

      {isLogicOpen && selectedQuestion !== undefined && (
        <LogicDialog
          questions={questions}
          initialQuestionId={selectedQuestion.id}
          editor={editor}
          onClose={() => setIsLogicOpen(false)}
        />
      )}

      {isPreviewOpen && <PreviewOverlay form={form} onClose={() => setIsPreviewOpen(false)} />}

      <EndingDialog isOpen={isEndingOpen} onClose={() => setIsEndingOpen(false)} form={form} onUpdate={editor.updateForm} />

      {/* Worded and laid out like Typeform's dialog. One difference in substance: our
          answers are removed by the next publish, not at once, so the bullet says so. */}
      <Modal
        isOpen={questionToDelete !== null}
        onClose={() => setQuestionToDelete(null)}
        title="Delete question with responses?"
      >
        {questionToDelete !== null && (
          <div className="text-admin-text">
            <p>This will also delete:</p>
            <ul className="mt-4 list-disc pl-10">
              <li>
                {questionToDelete.answer_count === 1
                  ? "The 1 response to this question, when you next publish"
                  : `All ${questionToDelete.answer_count} responses to this question, when you next publish`}
              </li>
            </ul>
            <p className="mt-5">
              Need your data?{" "}
              <a href={responsesExportUrl(form.id, "csv", [])} className="underline underline-offset-2">
                Download your responses
              </a>{" "}
              before deleting.
            </p>
          </div>
        )}
        <ModalActions>
          <Button variant="ghost" onClick={() => setQuestionToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => questionToDelete !== null && void deleteQuestion(questionToDelete)}>
            Delete question with responses
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
