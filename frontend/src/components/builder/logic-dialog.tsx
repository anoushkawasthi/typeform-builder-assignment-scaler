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

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Logic"
      description="Set rules to control how respondents view or progress through your form."
      widthClass="max-w-[960px]"
      tone="panel"
    >
      <div className="flex min-h-[420px] flex-col gap-4 md:flex-row">
        {/* Left: every question; the picked one is highlighted. */}
        <ul className="flex shrink-0 flex-col gap-1 md:w-[220px]">
          {questions.map((question, index) => (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => setPickedQuestionId(question.id)}
                aria-pressed={question.id === pickedQuestion.id}
                className={
                  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left " +
                  (question.id === pickedQuestion.id ? "bg-admin-hover" : "hover:bg-admin-hover")
                }
              >
                <QuestionTypeChip type={question.type} number={index + 1} />
                <span className="line-clamp-1 flex-1 text-[13px] text-admin-muted">{stripFormatting(question.title)}</span>
                {question.logic_jumps.length > 0 && (
                  <GitBranch aria-label="Has branching rules" className="h-4 w-4 shrink-0 text-admin-muted" />
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Right: the picked question and its three sections. */}
        <div className="flex-1 rounded-xl bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <QuestionTypeChip type={pickedQuestion.type} number={pickedIndex + 1} />
            <span className="text-admin-text">{stripFormatting(pickedQuestion.title)}</span>
          </div>

          <div className="flex flex-col gap-4">
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

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={deleteAllRules}
          disabled={totalRules === 0}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-danger-text hover:bg-admin-hover disabled:opacity-40"
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
    <section className="rounded-xl border border-admin-border">
      <button
        type="button"
        onClick={onToggle}
        disabled={onToggle === undefined}
        aria-expanded={isOpen}
        className="flex h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-admin-text enabled:hover:bg-admin-hover"
      >
        <Icon aria-hidden="true" className="h-4 w-4 text-admin-muted" />
        <span className="flex-1">{title}</span>
        {badge ?? (
          <ChevronDown aria-hidden="true" className={"h-4 w-4 text-admin-muted transition-transform " + (isOpen ? "rotate-180" : "")} />
        )}
      </button>
      {isOpen && children !== undefined && <div className="border-t border-admin-border-soft p-4">{children}</div>}
    </section>
  );
}
