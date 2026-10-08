/**
 * bar-chart.tsx — a vertical bar chart, drawn the way Typeform's summary draws one.
 *
 * What it does:   one bar per bucket (a choice, Yes/No, or a star value) with its count
 *                 written above it, its label below, and light horizontal grid lines
 *                 with a numbered axis on the left.
 * Depends on:     lib/types.ts.
 * Depended on by: summary-tab.tsx.
 *
 * It is built from plain elements with heights in percent, so there is no chart library
 * to learn: a bar that is half the axis's top value is simply 50% tall.
 */

import type { Bucket } from "@/lib/types";

interface BarChartProps {
  buckets: Bucket[];
  /** How many people answered the question; used for the percentage in the tooltip. */
  answerCount: number;
}

// Height of the plotting area in pixels.
const PLOT_HEIGHT = 220;

/**
 * Pick the value at the top of the axis and the numbers to print along it.
 *
 * Small counts get one line per unit with a line of headroom (0, 1, 2 for a largest
 * count of 1). Larger counts get four roughly even steps.
 */
function axisTicks(largestCount: number): number[] {
  if (largestCount <= 4) {
    const ticks: number[] = [];
    for (let tick = 0; tick <= largestCount + 1; tick++) {
      ticks.push(tick);
    }
    return ticks;
  }
  const step = Math.ceil(largestCount / 4);
  const ticks: number[] = [];
  for (let tick = 0; tick < largestCount + step; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

export function BarChart({ buckets, answerCount }: BarChartProps) {
  let largestCount = 0;
  for (const bucket of buckets) {
    if (bucket.count > largestCount) {
      largestCount = bucket.count;
    }
  }

  const ticks = axisTicks(largestCount);
  const axisTop = ticks[ticks.length - 1];

  return (
    <div className="mt-6 flex">
      {/* Axis numbers. Positioned by percentage so they line up with the grid lines. */}
      <div className="relative w-8 shrink-0" style={{ height: PLOT_HEIGHT }}>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute left-0 translate-y-1/2 text-[12px] leading-none text-admin-text"
            style={{ bottom: `${(tick / axisTop) * 100}%` }}
          >
            {tick}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: PLOT_HEIGHT }}>
          {/* Grid lines. The one at zero is darker and acts as the baseline. */}
          {ticks.map((tick) => (
            <span
              key={tick}
              className={"absolute inset-x-0 h-px " + (tick === 0 ? "bg-admin-muted/50" : "bg-admin-border")}
              style={{ bottom: `${(tick / axisTop) * 100}%` }}
            />
          ))}

          {/* Bars. Each bucket gets an equal slice of the width. */}
          <div className="absolute inset-0 flex items-end">
            {buckets.map((bucket, index) => {
              const percentOfAnswers = answerCount === 0 ? 0 : Math.round((bucket.count / answerCount) * 100);
              return (
                <div
                  key={`${index}-${bucket.label}`}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                  title={`${bucket.label}: ${bucket.count} (${percentOfAnswers}%)`}
                >
                  {/* The count uses a dark shade of the bar colour so it stays readable. */}
                  <span className="mb-1 text-[12px] font-semibold leading-none text-[#6B3A80]">{bucket.count}</span>
                  <div
                    // An empty bucket still shows a 2px sliver, so it reads as "zero"
                    // rather than as a missing bar.
                    // 80% of its slice, leaving a gap between neighbouring bars.
                    className="min-h-[2px] w-[80%] bg-chart"
                    style={{ height: `${(bucket.count / axisTop) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Labels under the bars, in matching equal slices. */}
        <div className="mt-2 flex">
          {buckets.map((bucket, index) => (
            <span
              key={`${index}-${bucket.label}`}
              className="flex-1 truncate px-1 text-center text-[13px] text-admin-text"
              title={bucket.label}
            >
              {bucket.label === "" ? "(no label)" : bucket.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
