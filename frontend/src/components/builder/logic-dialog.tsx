"use client";

/**
 * logic-dialog.tsx — the Logic dialog, laid out like Typeform's.
 *
 * What it does:   the form's questions are listed on the left; the right side shows the
 *                 picked question with three collapsible sections. "Branching" holds
 *                 the working rules (logic-editor.tsx). "Question display" and
 *                 "Calculations" are Typeform sections outside the brief and show
 *                 "Coming soon". "Delete all rules" clears the whole form's rules.
 * Depends on:     logic-editor.tsx, use-form-editor.ts, ui/modal.tsx, ui/button.tsx,
 *                 ui/question-type-chip.tsx, ui/coming-soon.tsx.
 * Depended on by: builder-screen.tsx.
 *
 * Rules save as they are changed, like everything else in the builder, so the footer
 * has "Done" where Typeform has Cancel and Save.
 */

import { Calculator, ChevronDown, EyeOff, GitBranch, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Modal } from "@/components/ui/modal";
import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import { stripFormatting } from "@/lib/formatted-text";
import type { Question } from "@/lib/types";

import { LogicEditor } from "./logic-editor";
import type { FormEditor } from "./use-form-editor";

interface LogicDialogProps {
  questions: Question[];
  /** The question to show first: the one selected in the builder. */
  initialQuestionId: number;
  editor: FormEditor;
  onClose: () => void;
}

export function LogicDialog({ questions, initialQuestionId, editor, onClose }: LogicDialogProps) {
  const [pickedQuestionId, setPickedQuestionId] = useState(initialQuestionId);
  // Branching starts open because it is the section that works.
  const [isBranchingOpen, setIsBranchingOpen] = useState(true);

  const pickedQuestion = questions.find((question) => question.id === pickedQuestionId) ?? questions[0];
  const pickedIndex = questions.indexOf(pickedQuestion);

  let totalRules = 0;
  for (const question of questions) {
    totalRules += question.logic_jumps.length;
  }

  function deleteAllRules() {
    for (const question of questions) {
      for (const rule of question.logic_jumps) {
        // Saves are queued and run one at a time (see use-form-editor.ts), so this is
        // simply a series of deletes.
        editor.deleteLogicJump(rule.id);
      }
    }
    toast.success("All rules deleted");
  }

  // Typeform's heading for this dialog is larger than a normal dialog title.
  const header = (
    <div className="px-7 pb-5 pt-5">
      <p className="text-[24px] leading-[31px] text-admin-text">Logic</p>
      <p className="mt-[9px] text-admin-muted">Set rules to control how respondents view or progress through your form.</p>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Logic"
      widthClass="max-w-[960px]"
      // As on Typeform: nearly the full height of the window, but never over 800px or under 500px.
      heightClass="h-[min(calc(100vh-32px),800px)] min-h-[500px]"
      header={header}
    >
      {/* The middle fills whatever height is left between the heading and the footer. */}
      <div className="flex min-h-0 flex-1">
        {/* Left: every question; the picked one is highlighted. */}
        <ul className="flex w-[248px] shrink-0 flex-col gap-1 overflow-y-auto px-4 pt-1">
          {questions.map((question, index) => {
            const isPicked = question.id === pickedQuestion.id;
            return (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => setPickedQuestionId(question.id)}
                  aria-pressed={isPicked}
                  className={
                    "flex h-11 w-full items-center gap-2 rounded-lg pl-[15px] pr-[11px] text-left " +
                    (isPicked ? "bg-admin-hover" : "hover:bg-admin-hover")
                  }
                >
                  <QuestionTypeChip type={question.type} number={index + 1} />
                  <span
                    className={
                      "line-clamp-1 flex-1 text-[13px] leading-[17px] " + (isPicked ? "text-admin-text" : "text-admin-muted")
                    }
                  >
                    {stripFormatting(question.title)}
                  </span>
                  {question.logic_jumps.length > 0 && (
                    <GitBranch aria-label="Has branching rules" className="h-4 w-4 shrink-0 text-admin-muted" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Right: the picked question and its three sections. The white area runs to
            the dialog's right edge, as in Typeform's. */}
        <div className="min-w-0 flex-1 overflow-y-auto rounded-l-xl bg-white p-10">
          <div className="mb-6 flex items-center gap-2">
            <QuestionTypeChip type={pickedQuestion.type} number={pickedIndex + 1} />
            <span className="font-medium text-black">{stripFormatting(pickedQuestion.title)}</span>
          </div>

          <div className="flex flex-col gap-6">
            <LogicSection icon={EyeOff} title="Question display" badge={<ComingSoonBadge />} />

            <LogicSection
              icon={GitBranch}
              title="Branching"
              isOpen={isBranchingOpen}
              onToggle={() => setIsBranchingOpen(!isBranchingOpen)}
            >
              <LogicEditor
                // A new key per question, so number boxes never carry over between questions.
                key={pickedQuestion.id}
                question={pickedQuestion}
                allQuestions={questions}
                onAdd={(rule) => editor.addLogicJump(pickedQuestion.id, rule)}
                onReplace={editor.replaceLogicJump}
                onDelete={editor.deleteLogicJump}
              />
            </LogicSection>

            <LogicSection icon={Calculator} title="Calculations" badge={<ComingSoonBadge />} />
          </div>
        </div>
      </div>

      <div className="flex h-14 shrink-0 items-center justify-between pl-4 pr-8">
        <button
          type="button"
          onClick={deleteAllRules}
          disabled={totalRules === 0}
          className="flex h-8 items-center gap-2 rounded-lg px-2 font-medium text-danger-text hover:bg-admin-hover disabled:opacity-40"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Delete all rules
        </button>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

interface LogicSectionProps {
  icon: LucideIcon;
  title: string;
  /** Shown at the right end in place of the arrow, for sections that cannot be opened. */
  badge?: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}

/** One outlined, collapsible block of the dialog. */
function LogicSection({ icon: Icon, title, badge, isOpen = false, onToggle, children }: LogicSectionProps) {
  return (
    <section className="rounded-lg border border-admin-border p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={onToggle === undefined}
        aria-expanded={isOpen}
        className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left font-medium text-admin-muted enabled:hover:bg-admin-hover"
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        <span className="flex-1">{title}</span>
        {badge ?? <ChevronDown aria-hidden="true" className={"h-4 w-4 transition-transform " + (isOpen ? "rotate-180" : "")} />}
      </button>
      {isOpen && children !== undefined && <div className="mt-3 border-t border-admin-border-soft px-3 pb-1 pt-4">{children}</div>}
    </section>
  );
}
