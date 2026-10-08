/**
 * bar-chart.tsx — a vertical bar chart, drawn the way Typeform's summary draws one.
 *
 * What it does:   one bar per bucket (a choice, Yes/No, or a star value) with its value
 *                 written above it, its label below, and light horizontal grid lines
 *                 with a numbered axis on the left.
 * Depends on:     chart-scale.ts (the numbers).
 * Depended on by: summary-tab.tsx.
 *
 * It is built from plain elements with heights in percent, so there is no chart library
 * to learn: a bar that is half the axis's top value is simply 50% tall.
 */

import type { ChartScale } from "./chart-scale";

// Height of the plotting area in pixels.
const PLOT_HEIGHT = 220;

export function BarChart({ scale }: { scale: ChartScale }) {
  const { bars, ticks, tickSuffix } = scale;
  const axisTop = ticks[ticks.length - 1];

  return (
    <div className="mt-11 flex">
      {/* Axis numbers. Positioned by percentage so they line up with the grid lines. */}
      <div className="relative w-10 shrink-0" style={{ height: PLOT_HEIGHT }}>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute left-0 translate-y-1/2 text-[12px] leading-none text-admin-text"
            style={{ bottom: `${(tick / axisTop) * 100}%` }}
          >
            {tick}
            {tickSuffix}
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
            {bars.map((bar, index) => (
              <div
                key={`${index}-${bar.label}`}
                className="flex h-full flex-1 flex-col items-center justify-end"
                title={bar.tooltip}
              >
                {/* The value uses a dark shade of the bar colour so it stays readable. */}
                <span className="mb-1 text-[12px] font-semibold leading-none text-chart-text">{bar.text}</span>
                <div
                  // An empty bucket still shows a 2px sliver, so it reads as "zero"
                  // rather than as a missing bar.
                  // 80% of its slice, leaving a gap between neighbouring bars.
                  className="min-h-[2px] w-[80%] bg-chart"
                  style={{ height: `${(bar.value / axisTop) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Labels under the bars, in matching equal slices. */}
        <div className="mt-2 flex">
          {bars.map((bar, index) => (
            <span
              key={`${index}-${bar.label}`}
              className="flex-1 truncate px-1 text-center text-[13px] text-admin-text"
              title={bar.label}
            >
              {bar.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
