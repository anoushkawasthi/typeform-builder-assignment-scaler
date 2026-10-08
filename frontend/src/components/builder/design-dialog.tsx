"use client";

/**
 * design-dialog.tsx — form-wide settings: the theme and the thank-you screen.
 *
 * What it does:   two tabs. "Theme" picks a ready-made theme or sets each colour and
 *                 the font by hand. "Thank-you screen" edits the text shown after
 *                 submitting.
 * Depends on:     ui/modal.tsx, ui/autosave-text.tsx, respondent/form-theme.tsx,
 *                 use-form-editor.ts.
 * Depended on by: builder-screen.tsx.
 */

import { useRef, useState } from "react";

import { AutosaveText } from "@/components/ui/autosave-text";
import { Modal } from "@/components/ui/modal";
import { THEME_FONTS } from "@/components/respondent/form-theme";
import type { FormDetail, FormUpdate, Theme } from "@/lib/types";

export type DesignTab = "theme" | "thank-you";

interface DesignDialogProps {
  /** Which tab is showing, or null when the dialog is closed. Owned by the builder. */
  activeTab: DesignTab | null;
  onTabChange: (tab: DesignTab) => void;
  onClose: () => void;
  form: FormDetail;
  onUpdate: (changes: FormUpdate) => void;
}

const PRESET_THEMES: { name: string; theme: Theme }[] = [
  {
    name: "Default",
    theme: {
      background_color: "#FAFAFA",
      question_color: "#2A222B",
      answer_color: "#2A222B",
      button_color: "#2A222B",
      button_text_color: "#FAFAFA",
      font: "Inter",
    },
  },
  {
    name: "Ocean",
    theme: {
      background_color: "#F0F7FF",
      question_color: "#0B2545",
      answer_color: "#0445AF",
      button_color: "#0445AF",
      button_text_color: "#FFFFFF",
      font: "Inter",
    },
  },
  {
    name: "Forest",
    theme: {
      background_color: "#F3F7F1",
      question_color: "#1F3B2D",
      answer_color: "#2F6B4A",
      button_color: "#2F6B4A",
      button_text_color: "#FFFFFF",
      font: "Georgia",
    },
  },
  {
    name: "Sunset",
    theme: {
      background_color: "#FFF6EE",
      question_color: "#4A1D1F",
      answer_color: "#C2410C",
      button_color: "#C2410C",
      button_text_color: "#FFFFFF",
      font: "System",
    },
  },
  {
    name: "Midnight",
    theme: {
      background_color: "#16141A",
      question_color: "#F5F3F7",
      answer_color: "#C9B8FF",
      button_color: "#C9B8FF",
      button_text_color: "#16141A",
      font: "Inter",
    },
  },
  {
    name: "Terminal",
    theme: {
      background_color: "#0F1A12",
      question_color: "#D6F5DD",
      answer_color: "#5BE37D",
      button_color: "#5BE37D",
      button_text_color: "#0F1A12",
      font: "Mono",
    },
  },
];

/** Converts a theme from the API's shape into the fields the update route expects. */
function themeToUpdate(theme: Theme): FormUpdate {
  return {
    theme_background_color: theme.background_color,
    theme_question_color: theme.question_color,
    theme_answer_color: theme.answer_color,
    theme_button_color: theme.button_color,
    theme_button_text_color: theme.button_text_color,
    theme_font: theme.font,
  };
}

export function DesignDialog({
  activeTab,
  onTabChange,
  onClose,
  form,
  onUpdate,
}: DesignDialogProps) {
  // Counts how many times a preset was applied. Used as the `key` of the colour fields
  // so they start afresh from the preset's colours (see ColorField below).
  const [presetVersion, setPresetVersion] = useState(0);

  function applyPreset(theme: Theme) {
    setPresetVersion((version) => version + 1);
    onUpdate(themeToUpdate(theme));
  }

  return (
    <Modal
      isOpen={activeTab !== null}
      onClose={onClose}
      title="Design"
      widthClass="max-w-[520px]"
    >
      <div
        role="tablist"
        className="mb-4 flex gap-1 rounded-lg bg-admin-hover p-[1px]"
      >
        <TabButton
          label="Theme"
          isActive={activeTab === "theme"}
          onClick={() => onTabChange("theme")}
        />
        <TabButton
          label="Thank-you screen"
          isActive={activeTab === "thank-you"}
          onClick={() => onTabChange("thank-you")}
        />
      </div>

      {activeTab !== "thank-you" ? (
        <div className="rounded-xl bg-white p-4">
          <h3 className="mb-2 font-medium text-admin-text">Themes</h3>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.theme)}
                className="rounded-lg border border-admin-border p-2 text-left hover:border-admin-text"
                style={{ backgroundColor: preset.theme.background_color }}
              >
                <span
                  className="block text-[13px] font-medium"
                  style={{ color: preset.theme.question_color }}
                >
                  {preset.name}
                </span>
                <span
                  className="mt-2 block h-2 w-10 rounded-full"
                  style={{ backgroundColor: preset.theme.button_color }}
                />
              </button>
            ))}
          </div>

          <h3 className="mb-1 mt-5 font-medium text-admin-text">
            Custom colours
          </h3>
          <div key={presetVersion}>
            <ColorField
              label="Background"
              value={form.theme.background_color}
              onSave={(color) => onUpdate({ theme_background_color: color })}
            />
            <ColorField
              label="Questions"
              value={form.theme.question_color}
              onSave={(color) => onUpdate({ theme_question_color: color })}
            />
            <ColorField
              label="Answers"
              value={form.theme.answer_color}
              onSave={(color) => onUpdate({ theme_answer_color: color })}
            />
            <ColorField
              label="Buttons"
              value={form.theme.button_color}
              onSave={(color) => onUpdate({ theme_button_color: color })}
            />
            <ColorField
              label="Button text"
              value={form.theme.button_text_color}
              onSave={(color) => onUpdate({ theme_button_text_color: color })}
            />
          </div>

          <label className="mt-1 flex h-10 items-center justify-between">
            <span className="text-admin-muted">Font</span>
            <select
              value={form.theme.font}
              onChange={(event) => onUpdate({ theme_font: event.target.value })}
              className="h-8 rounded-lg border border-admin-border bg-white px-2 text-admin-muted"
            >
              {Object.keys(THEME_FONTS).map((fontName) => (
                <option key={fontName} value={fontName}>
                  {fontName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-4">
          <label className="block">
            <span className="mb-1 block font-medium text-admin-text">
              Title
            </span>
            <AutosaveText
              value={form.thank_you_title}
              onSave={(title) => onUpdate({ thank_you_title: title })}
              ariaLabel="Thank-you title"
              className="rounded-lg border border-admin-border px-3 py-2 text-admin-text focus:border-admin-text"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1 block font-medium text-admin-text">
              Message
            </span>
            <AutosaveText
              value={form.thank_you_text}
              onSave={(text) => onUpdate({ thank_you_text: text })}
              ariaLabel="Thank-you message"
              allowLineBreaks
              className="min-h-[72px] rounded-lg border border-admin-border px-3 py-2 text-admin-text focus:border-admin-text"
            />
          </label>
          <p className="mt-3 text-[12px] text-admin-muted">
            Shown to respondents after they submit the form.
          </p>
        </div>
      )}
    </Modal>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={
        "h-[30px] flex-1 rounded-[7px] px-2 " +
        (isActive
          ? "bg-white/80 text-admin-active shadow-[inset_0_0_0_1px_var(--color-admin-border)]"
          : "text-admin-muted")
      }
    >
      {label}
    </button>
  );
}

// Dragging inside a colour picker fires a change many times a second. Saving waits
// until the colour has stopped changing for this long.
const COLOR_SAVE_DELAY_MS = 400;

function ColorField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (color: string) => void;
}) {
  // The colour chosen in this field since it was created, if any. It wins over the
  // saved `value` so the swatch does not flicker back while a save is in flight.
  // Applying a preset recreates the field (new `key`), which clears it.
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const color = pickedColor ?? value;

  function handleChange(newColor: string) {
    setPickedColor(newColor);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(
      () => onSave(newColor.toUpperCase()),
      COLOR_SAVE_DELAY_MS,
    );
  }

  return (
    <label className="flex h-10 items-center justify-between">
      <span className="text-admin-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[12px] uppercase text-admin-muted">{color}</span>
        <input
          type="color"
          value={color}
          onChange={(event) => handleChange(event.target.value)}
          className="h-7 w-9 cursor-pointer rounded border border-admin-border bg-white p-[2px]"
        />
      </span>
    </label>
  );
}
