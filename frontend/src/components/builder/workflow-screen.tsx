"use client";

/**
 * workflow-screen.tsx — the Workflow tab: every logic jump of the form on one page.
 *
 * What it does:   lists the questions in order and, under each, its rules written out
 *                 as sentences. Rules are edited in the builder (Content tab, Logic
 *                 panel); this page is the overview. Advanced branching is "Coming soon".
 * Depends on:     use-form-editor.ts, ui/form-header.tsx, ui/question-type-chip.tsx,
 *                 ui/coming-soon.tsx, lib/logic.ts.
 * Depended on by: app/forms/[id]/workflow/page.tsx.
 */

import { ArrowRight, CornerDownRight } from "lucide-react";
import Link from "next/link";

import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { FormHeader } from "@/components/ui/form-header";
import { stripFormatting } from "@/lib/formatted-text";
import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import { OPERATOR_LABELS } from "@/lib/logic";
import type { LogicJump, Question } from "@/lib/types";

import { useFormEditor } from "./use-form-editor";

/** The condition half of a rule as words, e.g. `is "Blue"` or `is greater than 3`. */
function describeCondition(question: Question, rule: LogicJump): string {
  if (rule.operator === "always") {
    return "Always";
  }
  let comparedWith = "";
  if (rule.compare_choice_id !== null) {
    const choice = question.choices.find((candidate) => candidate.id === rule.compare_choice_id);
    comparedWith = `"${choice === undefined ? "a removed choice" : stripFormatting(choice.label)}"`;
  } else if (rule.compare_boolean !== null) {
    comparedWith = rule.compare_boolean ? "Yes" : "No";
  } else if (rule.compare_number !== null) {
    comparedWith = String(rule.compare_number);
  }
  return `If the answer ${OPERATOR_LABELS[rule.operator]} ${comparedWith}`;
}

/** The destination half of a rule as words. */
function describeTarget(questions: Question[], rule: LogicJump): string {
  if (rule.target_question_id === null) {
    return "End of form";
  }
  const index = questions.findIndex((question) => question.id === rule.target_question_id);
  if (index === -1) {
    return "a removed question";
  }
  const title = questions[index].title === "" ? "..." : stripFormatting(questions[index].title);
  return `${index + 1}. ${title}`;
}

export function WorkflowScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const form = editor.form;
  const questions = form?.questions ?? [];

  let ruleCount = 0;
  for (const question of questions) {
    ruleCount += question.logic_jumps.length;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <FormHeader
        formId={formId}
        formTitle={form?.title ?? "..."}
        activeSection="workflow"
        onRename={(title) => editor.updateForm({ title })}
      />

      <main className="mx-4 mb-4 flex-1 rounded-xl bg-admin-panel p-4 sm:p-8">
        <div className="mx-auto max-w-[720px]">
          <h1 className="text-[24px] leading-8 text-admin-text">Workflow</h1>
          <p className="mt-1 text-admin-muted">
            {ruleCount === 0
              ? "This form has no logic jumps: everyone sees every question in order."
              : `${ruleCount} logic ${ruleCount === 1 ? "jump" : "jumps"}. Respondents skip ahead depending on their answers.`}{" "}
            <Link href={`/forms/${formId}/create`} className="underline">
              Edit rules in the builder
            </Link>
            , under Logic.
          </p>

          <ol className="mt-6 flex flex-col gap-2">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-xl bg-white p-4">
                <div className="flex items-start gap-3">
                  <QuestionTypeChip type={question.type} number={index + 1} />
                  <p className="font-medium text-admin-text">{question.title === "" ? "..." : stripFormatting(question.title)}</p>
                </div>

                {question.logic_jumps.length === 0 ? (
                  <p className="mt-2 flex items-center gap-2 pl-[60px] text-[13px] text-admin-muted">
                    <CornerDownRight aria-hidden="true" className="h-4 w-4" />
                    {index === questions.length - 1 ? "End of form" : "Continue to the next question"}
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1 pl-[60px]">
                    {question.logic_jumps.map((rule) => (
                      <li key={rule.id} className="flex flex-wrap items-center gap-2 text-[13px] text-admin-text">
                        <span className="rounded-md bg-[#DDD6FA] px-2 py-[2px]">{describeCondition(question, rule)}</span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 text-admin-muted" />
                        <span>{describeTarget(questions, rule)}</span>
                      </li>
                    ))}
                    <li className="text-[13px] text-admin-muted">Otherwise, continue to the next question</li>
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-4 text-admin-muted">
            Advanced branching: several conditions per rule, calculations and scoring
            <ComingSoonBadge />
          </div>
        </div>
      </main>
    </div>
  );
}
