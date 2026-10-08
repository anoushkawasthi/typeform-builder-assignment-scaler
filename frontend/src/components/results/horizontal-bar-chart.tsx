/**
 * horizontal-bar-chart.tsx — the summary chart turned on its side.
 *
 * What it does:   one row per bucket: its label on the left, a bar growing to the
 *                 right with its value at the end, light vertical grid lines, and the
 *                 numbered axis along the bottom. Long labels read better this way.
 * Depends on:     chart-scale.ts (the numbers).
 * Depended on by: summary-tab.tsx.
 *
 * Like bar-chart.tsx it is plain elements with widths in percent.
 */

import type { ChartScale } from "./chart-scale";

// Tailwind classes shared by the rows, the grid lines and the axis, so all three agree
// on where the plotting area starts and ends. 160px on the left holds the labels; 48px
// on the right leaves room for the value printed after the longest bar.
const LABEL_WIDTH = "w-[160px]";
const PLOT_INSET = "left-[160px] right-12";

export function HorizontalBarChart({ scale }: { scale: ChartScale }) {
  const { bars, ticks, tickSuffix } = scale;
  const axisEnd = ticks[ticks.length - 1];

  return (
    <div className="mt-8">
      <div className="relative">
        {/* Grid lines, drawn once behind every row. The one at zero is the baseline. */}
        <div className={`absolute inset-y-0 ${PLOT_INSET}`}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className={"absolute inset-y-0 w-px " + (tick === 0 ? "bg-admin-muted/50" : "bg-admin-border")}
              style={{ left: `${(tick / axisEnd) * 100}%` }}
            />
          ))}
        </div>

        {bars.map((bar, index) => (
          <div key={`${index}-${bar.label}`} className="relative flex h-11 items-center pr-12" title={bar.tooltip}>
            <span className={`${LABEL_WIDTH} shrink-0 truncate pr-3 text-right text-[13px] text-admin-text`}>
              {bar.label}
            </span>
            <div className="flex min-w-0 flex-1 items-center">
              <div
                // An empty bucket still shows a 2px sliver, so it reads as "zero".
                className="h-7 min-w-[2px] bg-chart"
                style={{ width: `${(bar.value / axisEnd) * 100}%` }}
              />
              {/* w-0 keeps the value from taking space, so a full-length bar still
                  reaches the last grid line; the text simply overflows to the right. */}
              <span className="w-0 whitespace-nowrap pl-1 text-[12px] font-semibold leading-none text-chart-text">
                {bar.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Axis numbers, each centred under its grid line. */}
      <div className="relative mt-2 h-4">
        <div className={`absolute inset-y-0 ${PLOT_INSET}`}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 text-[12px] leading-none text-admin-text"
              style={{ left: `${(tick / axisEnd) * 100}%` }}
            >
              {tick}
              {tickSuffix}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
