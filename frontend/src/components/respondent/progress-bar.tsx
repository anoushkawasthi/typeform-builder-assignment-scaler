/**
 * progress-bar.tsx — the thin bar across the top of a form.
 *
 * What it does:   shows how many questions have been answered out of the total.
 * Depends on:     nothing.
 * Depended on by: form-flow.tsx.
 */

interface ProgressBarProps {
  answered: number;
  total: number;
}

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <div
      role="progressbar"
      aria-label="Form progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      className="fixed inset-x-0 top-0 z-10 px-[6px] py-1"
    >
      <div className="h-[3px] overflow-hidden rounded-full bg-form-answer-40">
        {/* Only the width changes; the 0.2s transition is what makes it glide. */}
        <div
          className="h-full rounded-full bg-form-answer transition-[width] duration-200 ease-in-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
