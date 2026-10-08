/**
 * summary-tab.tsx — the "Response summary" tab of the results page.
 *
 * What it does:   one card per question: a bar chart for questions with fixed options
 *                 (choices, Yes/No, rating), the average for number and rating
 *                 questions, and the latest answers for text questions.
 * Depends on:     bar-chart.tsx, ui/question-type-chip.tsx, lib/types.ts.
 * Depended on by: results-screen.tsx.
 *
 * All the numbers are computed by the server (backend/app/services/stats.py); this file
 * only draws them.
 */

import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import type { FormSummary, QuestionSummary } from "@/lib/types";

import { BarChart } from "./bar-chart";

export function SummaryTab({ summary }: { summary: FormSummary }) {
  return (
    <div className="mx-auto max-w-[1192px]">
      <h1 className="text-[24px] leading-8 text-admin-text">Response summary</h1>
      <p className="mt-2 text-[16px] leading-6 text-admin-muted">
        A breakdown of form responses and key takeaways for each question.
      </p>

      <div className="my-8 border-t border-admin-border" />

      {summary.questions.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center">
          <h2 className="text-[24px] leading-8 text-admin-text">Waiting for responses</h2>
          <p className="mt-2 text-[16px] text-admin-muted">Your data will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {summary.questions.map((question, index) => (
            <QuestionCard
              key={question.question_id}
              question={question}
              number={index + 1}
              submittedCount={summary.submitted_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuestionCardProps {
  question: QuestionSummary;
  number: number;
  submittedCount: number;
}

function QuestionCard({ question, number, submittedCount }: QuestionCardProps) {
  const hasChart = question.buckets.length > 0;
  const hasAnswers = question.answer_count > 0;

  return (
    <section className="rounded-xl bg-white p-7">
      <div className="flex items-start gap-3">
        <QuestionTypeChip type={question.type} number={number} />
        <div>
          <h2 className="font-medium text-admin-text">{question.title === "" ? "..." : question.title}</h2>
          <p className="mt-2 text-admin-muted">
            {question.answer_count} out of {submittedCount} people answered this question.
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-admin-border-soft" />

      {!hasAnswers && (
        <div className="py-16 text-center">
          <p className="text-[24px] leading-8 text-admin-text">Waiting for responses</p>
          <p className="mt-2 text-[16px] text-admin-muted">Your data will appear here.</p>
        </div>
      )}

      {hasAnswers && question.average !== null && (
        <p className="mt-5 text-admin-muted">
          Average <span className="ml-2 text-[24px] leading-8 text-admin-text">{question.average}</span>
        </p>
      )}

      {hasAnswers && hasChart && <BarChart buckets={question.buckets} answerCount={question.answer_count} />}

      {hasAnswers && question.recent_texts.length > 0 && (
        <>
          <p className="mt-5 text-admin-muted">Latest answers</p>
          <ul className="mt-2 flex flex-col">
            {question.recent_texts.map((text, index) => (
              // Answers can repeat, so the position is part of the key.
              <li
                key={`${index}-${text}`}
                className="whitespace-pre-line border-b border-admin-border-soft py-3 text-admin-text last:border-b-0"
              >
                {text}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
