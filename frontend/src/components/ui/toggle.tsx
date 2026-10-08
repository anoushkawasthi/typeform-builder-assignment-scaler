/**
 * toggle.tsx — an on/off switch with its label.
 *
 * What it does:   the small pill switch used in the builder's settings panel.
 * Depends on:     nothing.
 * Depended on by: components/builder/question-settings.tsx.
 */

interface ToggleProps {
  label: string;
  isOn: boolean;
  onChange: (isOn: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, isOn, onChange, disabled = false }: ToggleProps) {
  return (
    // The whole row is the click target, not just the 28px switch.
    <label className={"flex h-10 items-center justify-between gap-3 " + (disabled ? "opacity-40" : "cursor-pointer")}>
      <span className="text-admin-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!isOn)}
        className={
          "relative h-4 w-7 shrink-0 rounded-full border transition-colors duration-150 " +
          (isOn ? "border-admin-active bg-admin-active" : "border-admin-border bg-admin-hover")
        }
      >
        <span
          className={
            "absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all duration-150 " +
            (isOn ? "left-[14px] bg-white" : "left-[2px] bg-admin-muted")
          }
        />
      </button>
    </label>
  );
}
