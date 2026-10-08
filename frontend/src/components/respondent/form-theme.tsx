/**
 * form-theme.tsx — applies a form's theme to everything inside it.
 *
 * What it does:   sets the CSS variables (--form-bg, --form-question, ...) that all the
 *                 respondent-side styles read. See app/globals.css for how they are used.
 * Depends on:     lib/types.ts.
 * Depended on by: form-flow.tsx (public form, preview) and the builder canvas.
 *
 * Why CSS variables: the components never mention a concrete colour, so a form with a
 * custom theme needs no special code — only different variable values.
 */

import type { CSSProperties, ReactNode } from "react";

import type { Theme } from "@/lib/types";

/** Font names a theme may use, mapped to real CSS font stacks. */
export const THEME_FONTS: Record<string, string> = {
  Inter: "var(--font-inter), system-ui, sans-serif",
  System: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  Mono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
};

export function themeToCssVariables(theme: Theme): CSSProperties {
  // The `as CSSProperties` is needed because TypeScript's style type does not list
  // custom properties (names starting with --).
  return {
    "--form-bg": theme.background_color,
    "--form-question": theme.question_color,
    "--form-answer": theme.answer_color,
    "--form-button": theme.button_color,
    "--form-button-text": theme.button_text_color,
    "--form-font": THEME_FONTS[theme.font] ?? THEME_FONTS.Inter,
  } as CSSProperties;
}

interface FormThemeProps {
  theme: Theme;
  className?: string;
  children: ReactNode;
}

export function FormTheme({ theme, className, children }: FormThemeProps) {
  return (
    <div style={themeToCssVariables(theme)} className={`bg-form-bg font-form ${className ?? ""}`}>
      {children}
    </div>
  );
}
