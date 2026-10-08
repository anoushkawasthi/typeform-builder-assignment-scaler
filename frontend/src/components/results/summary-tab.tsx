"use client";

/**
 * summary-tab.tsx — the "Response summary" tab of the results page.
 *
 * What it does:   a toolbar (order of the bars, counts or percentages) and one card per
 *                 question. Questions with fixed options (choices, Yes/No, rating) can
 *                 be seen as a vertical chart, a horizontal chart or a table; number
 *                 and rating questions show the average; text questions show the
 *                 latest answers.
 * Depends on:     bar-chart.tsx, horizontal-bar-chart.tsx, choices-table.tsx,
 *                 chart-scale.ts, ui/segmented-control.tsx, ui/button.tsx,
 *                 ui/question-type-chip.tsx, lib/types.ts, sonner.
 * Depended on by: results-screen.tsx.
 *
 * All the counting is done by the server (backend/app/services/stats.py). This file
 * only decides how the numbers are shown: the toolbar's choices apply to every card,
 * and each card remembers its own chart type.
 */

import { ArrowDown, ArrowUp, Calendar, ChartBar, ChartColumn, Gem, Hash, ListFilter, ListOrdered, Palette, Percent, Table2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { QuestionTypeChip } from "@/components/ui/question-type-chip";
import { SegmentedControl, type Segment } from "@/components/ui/segmented-control";
import { stripFormatting } from "@/lib/formatted-text";
import type { FormSummary, QuestionSummary } from "@/lib/types";

import { BarChart } from "./bar-chart";
import { buildChartScale, sortBuckets, type SortOrder } from "./chart-scale";
import { ChoicesTable } from "./choices-table";
import { HorizontalBarChart } from "./horizontal-bar-chart";

type ValueMode = "count" | "percent";
type ChartView = "table" | "horizontal" | "vertical";
type CardSection = "overview" | "trends";

const SORT_SEGMENTS: Segment<SortOrder>[] = [
  { value: "form", title: "Order as in the form", icon: ListOrdered },
  { value: "ascending", title: "Fewest responses first", icon: ArrowUp },
  { value: "descending", title: "Most responses first", icon: ArrowDown },
];

const VALUE_SEGMENTS: Segment<ValueMode>[] = [
  { value: "count", title: "Show counts", icon: Hash },
  { value: "percent", title: "Show percentages", icon: Percent },
];

const VIEW_SEGMENTS: Segment<ChartView>[] = [
  { value: "table", title: "Table", icon: Table2 },
  { value: "horizontal", title: "Horizontal chart", icon: ChartBar },
  { value: "vertical", title: "Vertical chart", icon: ChartColumn },
];

const SECTION_SEGMENTS: Segment<CardSection>[] = [
  { value: "overview", title: "Overview", label: "Overview" },
  { value: "trends", title: "Trends (coming soon)", label: "Trends", icon: Gem },
];

export function SummaryTab({ summary }: { summary: FormSummary }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("form");
  const [valueMode, setValueMode] = useState<ValueMode>("count");

  return (
    <div className="mx-auto w-full max-w-[1192px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] leading-8 text-admin-text">Response summary</h1>
          <p className="mt-2 text-[16px] leading-6 text-admin-muted">
            A breakdown of form responses and key takeaways for each question.
          </p>
        </div>
        <Button iconOnly aria-label="Chart colours" title="Chart colours" onClick={() => toast("Chart colours are coming soon")}>
          <Palette aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-[18px] border-t border-admin-border" />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SegmentedControl ariaLabel="Order of the bars" segments={SORT_SEGMENTS} value={sortOrder} onChange={setSortOrder} />
        <SegmentedControl ariaLabel="Counts or percentages" segments={VALUE_SEGMENTS} value={valueMode} onChange={setValueMode} />
        <span aria-hidden="true" className="h-6 w-px bg-admin-border" />
        {/* Filtering by date or by answer is outside the brief; the buttons mark the spot. */}
        <Button onClick={() => toast("Date ranges are coming soon")}>
          All time
          <Calendar aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button onClick={() => toast("Filters are coming soon")}>
          <ListFilter aria-hidden="true" className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {summary.questions.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white p-12 text-center">
          <h2 className="text-[24px] leading-8 text-admin-text">Waiting for responses</h2>
          <p className="mt-2 text-[16px] text-admin-muted">Your data will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {summary.questions.map((question, index) => (
            <QuestionCard
              key={question.question_id}
              question={question}
              number={index + 1}
              submittedCount={summary.submitted_count}
              sortOrder={sortOrder}
              showPercent={valueMode === "percent"}
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
  sortOrder: SortOrder;
  showPercent: boolean;
}

function QuestionCard({ question, number, submittedCount, sortOrder, showPercent }: QuestionCardProps) {
  // Each card keeps its own chart type, so one question can be a table while the
  // others stay charts.
  const [view, setView] = useState<ChartView>("vertical");

  // Only questions with fixed options have buckets, and only those can be charted.
  const hasChart = question.buckets.length > 0;
  const hasAnswers = question.answer_count > 0;

  const buckets = sortBuckets(question.buckets, sortOrder);
  const scale = buildChartScale(buckets, question.answer_count, showPercent);

  function changeSection(section: CardSection) {
    // "Trends" (answers over time) is a paid Typeform feature; here it is a placeholder.
    if (section === "trends") {
      toast("Trends are coming soon");
    }
  }

  return (
    <section className="rounded-xl bg-white p-7">
      <div className="flex items-start gap-3">
        <span className="mt-[2px]">
          <QuestionTypeChip type={question.type} number={number} />
        </span>
        <div>
          <h2 className="text-[20px] leading-7 text-admin-text">
            {question.title === "" ? "..." : stripFormatting(question.title)}
          </h2>
          <p className="mt-1 text-admin-muted">
            {question.answer_count} out of {submittedCount} people answered this question.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-admin-border-soft" />

      {hasChart && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <SegmentedControl ariaLabel="Section" segments={SECTION_SEGMENTS} value="overview" onChange={changeSection} />
          {/* With no answers there is nothing to draw, so the chart type is greyed out. */}
          <SegmentedControl ariaLabel="Chart type" segments={VIEW_SEGMENTS} value={view} onChange={setView} disabled={!hasAnswers} />
        </div>
      )}

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

      {hasAnswers && hasChart && view === "vertical" && <BarChart scale={scale} />}
      {hasAnswers && hasChart && view === "horizontal" && <HorizontalBarChart scale={scale} />}
      {hasAnswers && hasChart && view === "table" && <ChoicesTable buckets={buckets} answerCount={question.answer_count} />}

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
