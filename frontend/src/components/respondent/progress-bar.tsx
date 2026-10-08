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
      // Absolute, not fixed: it sticks to the top of the form's own box, which is the
      // whole window on the public page and the frame in the preview.
      className="absolute inset-x-0 top-0 z-10 px-[6px] py-1"
    >
      {/* Two rounded pieces side by side: the dark "done" part and the grey "to do"
          part, with a 4px gap between them once there is something done. */}
      <div className="flex h-[3px]">
        {/* Only the width changes; the 0.4s transition is what makes it glide. */}
        <div
          className="h-full rounded-full bg-form-answer transition-[width,margin] duration-[400ms] ease-in-out"
          style={{ width: `${percent}%`, marginRight: percent > 0 && percent < 100 ? 4 : 0 }}
        />
        <div className="h-full flex-1 rounded-full bg-form-answer-40" />
      </div>
    </div>
  );
}
