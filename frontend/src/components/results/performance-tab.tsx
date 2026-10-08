/**
 * performance-tab.tsx — the "Form performance" tab of the results page.
 *
 * What it does:   the headline numbers as tiles: starts, submissions, completion rate
 *                 and average time to complete.
 * Depends on:     lib/types.ts.
 * Depended on by: results-screen.tsx.
 *
 * Typeform also shows "Views". We do not record page views (only starts), so that tile
 * is left out rather than showing a made-up number.
 */

import type { FormSummary } from "@/lib/types";

/** 171.5 seconds -> "02:52". */
function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "-";
  }
  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function PerformanceTab({ summary }: { summary: FormSummary }) {
  const completionRate = summary.completion_rate === null ? "-" : `${Math.round(summary.completion_rate)}%`;

  return (
    <div className="mx-auto w-full max-w-[1192px]">
      <h1 className="text-[24px] leading-8 text-admin-text">Form performance</h1>
      <p className="mt-2 text-[16px] leading-6 text-admin-muted">Key metrics that show how your form is doing.</p>

      <div className="my-8 border-t border-admin-border" />

      <h2 className="text-[21px] leading-7 text-admin-text">At a glance</h2>
      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label="Starts" value={String(summary.started_count)} />
        <StatTile label="Submissions" value={String(summary.submitted_count)} />
        <StatTile label="Completion rate" value={completionRate} />
        <StatTile label="Time to complete" value={formatDuration(summary.average_seconds_to_complete)} />
      </div>

      <p className="mt-6 text-[13px] text-admin-muted">
        A start is counted when someone answers their first question. Completion rate is submissions divided by
        starts.
      </p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-admin-muted">{label}</p>
      <p className="mt-11 text-[32px] leading-10 text-admin-text">{value}</p>
    </div>
  );
}
