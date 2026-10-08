"use client";

/**
 * welcome-settings.tsx — the builder's right panel while the welcome screen is selected.
 *
 * What it does:   the Start button's text, and removing the welcome screen.
 * Depends on:     ui/button.tsx, lib/types.ts.
 * Depended on by: builder-screen.tsx.
 */

import { PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/question-type-chip";
import type { FormDetail, FormUpdate } from "@/lib/types";

interface WelcomeSettingsProps {
  form: FormDetail;
  onUpdate: (changes: FormUpdate) => void;
  onRemove: () => void;
}

// The server allows at most this many characters on the button.
const BUTTON_TEXT_LIMIT = 24;

export function WelcomeSettings({ form, onUpdate, onRemove }: WelcomeSettingsProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      <section className="rounded-xl bg-admin-panel p-4">
        <div className="flex h-8 items-center gap-2 rounded-lg border border-admin-border bg-white/80 px-2 text-admin-muted">
          <IconTile color="#DEDCDE" icon={PanelLeftOpen} />
          Welcome Screen
        </div>

        <label className="mt-4 block border-t border-admin-border-soft pt-3">
          <span className="text-admin-muted">Button</span>
          <input
            // `key` restarts the box if the saved text changes from elsewhere. It saves
            // when you leave the field, and an empty value falls back to "Start".
            key={form.welcome_button_text}
            type="text"
            defaultValue={form.welcome_button_text}
            maxLength={BUTTON_TEXT_LIMIT}
            onBlur={(event) => {
              const text = event.target.value.trim() === "" ? "Start" : event.target.value.trim();
              if (text !== form.welcome_button_text) {
                onUpdate({ welcome_button_text: text });
              }
            }}
            className="mt-2 h-8 w-full rounded-lg border border-admin-border bg-white/80 px-3 text-admin-text outline-none focus:border-admin-text"
          />
          <span className="mt-1 block text-right text-[12px] text-admin-muted">
            {form.welcome_button_text.length}/{BUTTON_TEXT_LIMIT}
          </span>
        </label>

        <div className="mt-2 border-t border-admin-border-soft pt-3">
          <Button onClick={onRemove}>Remove welcome screen</Button>
        </div>
      </section>
    </aside>
  );
}
