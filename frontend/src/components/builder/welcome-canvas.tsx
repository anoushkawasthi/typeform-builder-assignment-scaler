"use client";

/**
 * welcome-canvas.tsx — the builder's centre panel while the welcome screen is selected.
 *
 * What it does:   draws the welcome screen as respondents will see it, with its title
 *                 and text editable in place.
 * Depends on:     respondent/welcome-screen.tsx and respondent/form-theme.tsx (the same
 *                 components the public form uses), ui/autosave-text.tsx.
 * Depended on by: builder-screen.tsx.
 */

import { WelcomeScreen } from "@/components/respondent/welcome-screen";
import { AutosaveText } from "@/components/ui/autosave-text";
import type { FormDetail, FormUpdate } from "@/lib/types";

import { CanvasFrame } from "./canvas-frame";

interface WelcomeCanvasProps {
  form: FormDetail;
  onUpdate: (changes: FormUpdate) => void;
}

export function WelcomeCanvas({ form, onUpdate }: WelcomeCanvasProps) {
  return (
    // The same frame and scaling as the question canvas (canvas-frame.tsx).
    <CanvasFrame theme={form.theme}>
        <WelcomeScreen
          title={form.welcome_title}
          text={form.welcome_text}
          buttonText={form.welcome_button_text}
          questionCount={form.questions.length}
          titleContent={
            <AutosaveText
              value={form.welcome_title}
              onSave={(title) => onUpdate({ welcome_title: title })}
              placeholder="Say hi!"
              ariaLabel="Welcome title"
              allowFormatting
              className="text-center text-form-question placeholder:italic placeholder:text-form-question-80"
            />
          }
          textContent={
            <AutosaveText
              value={form.welcome_text}
              onSave={(text) => onUpdate({ welcome_text: text })}
              placeholder="Description (optional)"
              ariaLabel="Welcome description"
              allowLineBreaks
              allowFormatting
              className="mt-2 text-center text-[16px] leading-[22px] text-form-question placeholder:italic @2xl:text-[18px] @2xl:leading-6"
            />
          }
        />
    </CanvasFrame>
  );
}
