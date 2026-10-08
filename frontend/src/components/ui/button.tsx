/**
 * button.tsx — the admin UI's button.
 *
 * What it does:   one button component with four looks, so every button in the
 *                 creator screens has the same height, radius and states.
 * Depends on:     nothing.
 * Depended on by: almost every admin component.
 */

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Square button for a single icon. */
  iconOnly?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-admin-text text-white hover:bg-admin-active",
  outline: "border border-admin-border bg-white/80 text-admin-muted hover:bg-admin-hover",
  ghost: "text-admin-muted hover:bg-admin-hover",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "outline", iconOnly = false, className, type, ...rest }: ButtonProps) {
  return (
    <button
      // Default to "button" so a Button inside a <form> never submits it by accident.
      type={type ?? "button"}
      className={
        "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-lg text-[14px] font-medium leading-5 " +
        "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 " +
        (iconOnly ? "w-8 " : "px-3 ") +
        VARIANT_CLASSES[variant] +
        " " +
        (className ?? "")
      }
      {...rest}
    />
  );
}
