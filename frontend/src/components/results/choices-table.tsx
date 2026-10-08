/**
 * choices-table.tsx — a question's summary as a table instead of a chart.
 *
 * What it does:   one row per bucket with how many people picked it and what share of
 *                 the people who answered that is, as in Typeform's table view.
 * Depends on:     chart-scale.ts (percentOf), lib/types.ts.
 * Depended on by: summary-tab.tsx.
 */

import type { Bucket } from "@/lib/types";

import { percentOf } from "./chart-scale";

interface ChoicesTableProps {
  buckets: Bucket[];
  /** How many people answered the question; the percentages are out of this. */
  answerCount: number;
}

const CELL_CLASSES = "h-[41px] border-l border-admin-border px-3 text-left font-normal first:border-l-0";

export function ChoicesTable({ buckets, answerCount }: ChoicesTableProps) {
  return (
    <table className="mt-6 w-full table-fixed border-collapse text-admin-text">
      <thead>
        <tr className="border-b border-admin-muted/40">
          <th className={CELL_CLASSES}>Choices</th>
          <th className={CELL_CLASSES}>Responses</th>
          <th className={CELL_CLASSES}>Percentages</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket, index) => (
          // Two choices can share a label, so the position is part of the key.
          <tr key={`${index}-${bucket.label}`} className="border-b border-admin-border">
            <td className={CELL_CLASSES + " truncate"} title={bucket.label}>
              {bucket.label === "" ? "(no label)" : bucket.label}
            </td>
            <td className={CELL_CLASSES}>{bucket.count}</td>
            <td className={CELL_CLASSES}>{percentOf(bucket.count, answerCount)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
