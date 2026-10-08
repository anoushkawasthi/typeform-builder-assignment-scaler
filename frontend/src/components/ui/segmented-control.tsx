/**
 * segmented-control.tsx — a row of joined buttons of which exactly one is picked.
 *
 * What it does:   draws Typeform's grey pill with a white tile on the picked option. An
 *                 option can show an icon, text, or both.
 * Depends on:     lucide-react (icon type only).
 * Depended on by: results/summary-tab.tsx (sort order, count or percent, chart type),
 *                 results/responses-tab.tsx (Responses or Spam).
 *
 * It keeps no state of its own: the parent passes the picked value and is told when
 * another option is clicked.
 */

import type { LucideIcon } from "lucide-react";

export interface Segment<Value extends string> {
  value: Value;
  /** Shown as a tooltip and read out by screen readers. */
  title: string;
  /** Text on the button. Leave out for a button that is only an icon. */
  label?: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<Value extends string> {
  /** What the group as a whole chooses, for screen readers (e.g. "Chart type"). */
  ariaLabel: string;
  segments: Segment<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  disabled?: boolean;
}

export function SegmentedControl<Value extends string>({
  ariaLabel,
  segments,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={"inline-flex h-8 shrink-0 items-center rounded-lg bg-admin-hover p-[2px] " + (disabled ? "opacity-40" : "")}
    >
      {segments.map((segment) => {
        const isPicked = segment.value === value;
        const Icon = segment.icon;
        return (
          <button
            key={segment.value}
            type="button"
            title={segment.title}
            aria-label={segment.title}
            aria-pressed={isPicked}
            disabled={disabled}
            onClick={() => onChange(segment.value)}
            className={
              "flex h-7 items-center justify-center gap-2 rounded-[6px] text-[14px] leading-5 " +
              // An icon-only button is a square; one with text gets side padding.
              (segment.label === undefined ? "w-[30px] " : "px-3 ") +
              (isPicked
                ? "bg-white text-admin-text shadow-[0_0_0_1px_var(--color-admin-border)]"
                : "text-admin-muted hover:text-admin-text")
            }
          >
            {Icon !== undefined && <Icon aria-hidden="true" className="h-4 w-4" />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
