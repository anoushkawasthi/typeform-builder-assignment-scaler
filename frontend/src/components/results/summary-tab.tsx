/**
 * summary-tab.tsx — the "Response summary" tab of the results page.
 *
 * What it does:   headline numbers (starts, submissions, completion rate) as tiles,
 *                 then one card per question: a bar per choice / yes-no / star value,
 *                 the average for number and rating questions, and the latest answers
 *                 for text questions.
 * Depends on:     ui/question-type-chip.tsx, lib/types.ts.
 * Depended on by: results-screen.tsx.
 *
 * All the numbers are computed by the server (backend/app/services/stats.py); this file
 * only draws them.
 */

import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import type { Bucket, FormSummary, QuestionSummary } from "@/lib/types";

export function SummaryTab({ summary }: { summary: FormSummary }) {
  const completionRate = summary.completion_rate === null ? "–" : `${summary.completion_rate}%`;

  return (
    <div className="mx-auto max-w-[960px]">
      <h1 className="text-[24px] leading-8 text-admin-text">Response summary</h1>
      <p className="mt-1 text-admin-muted">A breakdown of form responses for each question.</p>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatTile label="Starts" value={String(summary.started_count)} />
        <StatTile label="Submissions" value={String(summary.submitted_count)} />
        <StatTile label="Completion rate" value={completionRate} />
      </div>

      {summary.questions.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white p-12 text-center">
          <h2 className="text-[21px] leading-7 text-admin-text">Waiting for responses</h2>
          <p className="mt-2 text-admin-muted">Publish this form and share its link. Your data will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-admin-muted">{label}</p>
      <p className="mt-6 text-[32px] leading-10 text-admin-text">{value}</p>
    </div>
  );
}

interface QuestionCardProps {
  question: QuestionSummary;
  number: number;
  submittedCount: number;
}

function QuestionCard({ question, number, submittedCount }: QuestionCardProps) {
  return (
    <section className="rounded-xl bg-white p-6">
      <div className="flex items-start gap-3">
        <QuestionTypeChip type={question.type} number={number} />
        <div>
          <h2 className="font-medium text-admin-text">{question.title === "" ? "..." : question.title}</h2>
          <p className="mt-1 text-admin-muted">
            {question.answer_count} out of {submittedCount} people answered this question.
          </p>
        </div>
      </div>

      {question.average !== null && (
        <p className="mt-5 text-admin-muted">
          Average <span className="ml-2 text-[24px] leading-8 text-admin-text">{question.average}</span>
        </p>
      )}

      {question.buckets.length > 0 && <BucketBars buckets={question.buckets} answerCount={question.answer_count} />}

      {question.recent_texts.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2">
          {question.recent_texts.map((text, index) => (
            // Answers can repeat, so the position is part of the key.
            <li key={`${index}-${text}`} className="rounded-lg bg-admin-panel px-3 py-2 text-admin-text">
              {text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * One horizontal bar per bucket, drawn with plain divs.
 *
 * Bar length is the share of people who answered the question. For multi-select
 * questions the shares can add up to more than 100%, because one person can pick
 * several choices.
 */
function BucketBars({ buckets, answerCount }: { buckets: Bucket[]; answerCount: number }) {
  return (
    <ul className="mt-5 flex flex-col gap-3">
      {buckets.map((bucket, index) => {
        const percent = answerCount === 0 ? 0 : Math.round((bucket.count / answerCount) * 100);
        return (
          <li key={`${index}-${bucket.label}`} title={`${bucket.label}: ${bucket.count} (${percent}%)`}>
            {/* Labels use text colours, never the bar colour, so they stay readable. */}
            <div className="mb-1 flex justify-between gap-4">
              <span className="text-admin-text">{bucket.label === "" ? "(no label)" : bucket.label}</span>
              <span className="shrink-0 text-admin-muted">
                {bucket.count} · {percent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-admin-hover">
              <div className="h-2 rounded-full bg-chart" style={{ width: `${percent}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
