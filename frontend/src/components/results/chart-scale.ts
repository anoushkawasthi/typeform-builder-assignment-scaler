/**
 * chart-scale.ts — the arithmetic behind a summary chart.
 *
 * What it does:   turns a question's buckets (label + count) into bars with the number
 *                 to draw and the text to print, and picks the numbers along the axis.
 *                 It can do this for counts ("3") or for percentages ("60%").
 * Depends on:     lib/types.ts.
 * Depended on by: bar-chart.tsx, horizontal-bar-chart.tsx, choices-table.tsx,
 *                 summary-tab.tsx.
 *
 * The vertical and horizontal charts are the same numbers drawn in two directions, so
 * the numbers are worked out once here and the chart files only draw.
 */

import type { Bucket } from "@/lib/types";

export type SortOrder = "form" | "ascending" | "descending";

export interface ChartBar {
  label: string;
  /** How long the bar is, in the axis's units. */
  value: number;
  /** What is printed beside the bar: "3" or "60%". */
  text: string;
  /** Shown when the mouse rests on the bar: "Blue: 3 (60%)". */
  tooltip: string;
}

export interface ChartScale {
  bars: ChartBar[];
  /** Numbers printed along the axis, starting at 0. The last one is the axis's end. */
  ticks: number[];
  /** Added after each axis number: "" for counts, "%" for percentages. */
  tickSuffix: string;
}

/** 3 of 5 -> 60. Zero answers gives 0 rather than a division by zero. */
export function percentOf(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((count / total) * 100);
}

/**
 * The buckets in the order the toolbar asks for. "form" keeps the order the choices
 * have in the form. Sorting a copy leaves the data from the server untouched.
 */
export function sortBuckets(buckets: Bucket[], order: SortOrder): Bucket[] {
  if (order === "form") {
    return buckets;
  }
  const sorted = [...buckets];
  sorted.sort((first, second) => (order === "ascending" ? first.count - second.count : second.count - first.count));
  return sorted;
}

/**
 * Pick the numbers to print along a count axis.
 *
 * Small counts get one line per unit with a line of headroom (0, 1, 2 for a largest
 * count of 1). Larger counts get four roughly even steps.
 */
function countTicks(largestCount: number): number[] {
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

export function buildChartScale(buckets: Bucket[], answerCount: number, showPercent: boolean): ChartScale {
  let largestCount = 0;
  const bars: ChartBar[] = [];

  for (const bucket of buckets) {
    if (bucket.count > largestCount) {
      largestCount = bucket.count;
    }
    const percent = percentOf(bucket.count, answerCount);
    const label = bucket.label === "" ? "(no label)" : bucket.label;
    bars.push({
      label,
      value: showPercent ? percent : bucket.count,
      text: showPercent ? `${percent}%` : String(bucket.count),
      tooltip: `${label}: ${bucket.count} (${percent}%)`,
    });
  }

  if (showPercent) {
    // A percentage axis always runs from 0 to 100, so charts can be compared by eye.
    return { bars, ticks: [0, 25, 50, 75, 100], tickSuffix: "%" };
  }
  return { bars, ticks: countTicks(largestCount), tickSuffix: "" };
}
