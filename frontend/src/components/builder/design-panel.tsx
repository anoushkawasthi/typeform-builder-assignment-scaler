"use client";

/**
 * design-panel.tsx — the floating Design panel: the form's theme.
 *
 * What it does:   two tabs, as in Typeform. "My theme" sets each colour and the font by
 *                 hand; "Gallery" applies a ready-made theme. It floats under the
 *                 toolbar without covering the page, so the canvas behind it recolours
 *                 live as you choose.
 * Depends on:     respondent/form-theme.tsx (font list), lib/types.ts.
 * Depended on by: builder-screen.tsx.
 */

import { GripVertical, X } from "lucide-react";
import { useRef, useState } from "react";

import { THEME_FONTS } from "@/components/respondent/form-theme";
import type { FormDetail, FormUpdate, Theme } from "@/lib/types";

interface DesignPanelProps {
  form: FormDetail;
  onUpdate: (changes: FormUpdate) => void;
  onClose: () => void;
}

type DesignTab = "my-theme" | "gallery";

const GALLERY_THEMES: { name: string; theme: Theme }[] = [
  {
    name: "Default",
    theme: { background_color: "#FAFAFA", question_color: "#2A222B", answer_color: "#2A222B", button_color: "#2A222B", button_text_color: "#FAFAFA", font: "Inter" },
  },
  {
    name: "Ocean",
    theme: { background_color: "#F0F7FF", question_color: "#0B2545", answer_color: "#0445AF", button_color: "#0445AF", button_text_color: "#FFFFFF", font: "Inter" },
  },
  {
    name: "Forest",
    theme: { background_color: "#F3F7F1", question_color: "#1F3B2D", answer_color: "#2F6B4A", button_color: "#2F6B4A", button_text_color: "#FFFFFF", font: "Georgia" },
  },
  {
    name: "Sunset",
    theme: { background_color: "#FFF6EE", question_color: "#4A1D1F", answer_color: "#C2410C", button_color: "#C2410C", button_text_color: "#FFFFFF", font: "System" },
  },
  {
    name: "Midnight",
    theme: { background_color: "#16141A", question_color: "#F5F3F7", answer_color: "#C9B8FF", button_color: "#C9B8FF", button_text_color: "#16141A", font: "Inter" },
  },
  {
    name: "Terminal",
    theme: { background_color: "#0F1A12", question_color: "#D6F5DD", answer_color: "#5BE37D", button_color: "#5BE37D", button_text_color: "#0F1A12", font: "Mono" },
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

export function DesignPanel({ form, onUpdate, onClose }: DesignPanelProps) {
  const [activeTab, setActiveTab] = useState<DesignTab>("my-theme");
  // Counts how many times a gallery theme was applied. Used as the `key` of the colour
  // fields so they start afresh from the new theme's colours (see ColorField below).
  const [galleryVersion, setGalleryVersion] = useState(0);

  function applyGalleryTheme(theme: Theme) {
    setGalleryVersion((version) => version + 1);
    onUpdate(themeToUpdate(theme));
  }

  return (
    <section
      aria-label="Design"
      className="absolute left-[140px] top-[44px] z-30 w-[544px] max-w-[calc(100%-16px)] rounded-xl border border-admin-border bg-white p-2 shadow-[0_0_0_3px_var(--color-admin-ring)]"
    >
      <header className="flex h-10 items-center justify-between pl-2">
        <h2 className="flex items-center gap-3 font-medium text-admin-text">
          <GripVertical aria-hidden="true" className="h-4 w-4 text-admin-muted" />
          Design
        </h2>
        <button
          type="button"
          aria-label="Close design panel"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="rounded-xl bg-admin-panel">
        <div role="tablist" className="flex gap-4 border-b-2 border-white px-4">
          <PanelTab label="My theme" isActive={activeTab === "my-theme"} onClick={() => setActiveTab("my-theme")} />
          <PanelTab label="Gallery" isActive={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} />
        </div>

        {activeTab === "my-theme" ? (
          <div key={galleryVersion} className="px-5 py-3">
            <ColorField label="Background" value={form.theme.background_color} onSave={(color) => onUpdate({ theme_background_color: color })} />
            <ColorField label="Questions" value={form.theme.question_color} onSave={(color) => onUpdate({ theme_question_color: color })} />
            <ColorField label="Answers" value={form.theme.answer_color} onSave={(color) => onUpdate({ theme_answer_color: color })} />
            <ColorField label="Buttons" value={form.theme.button_color} onSave={(color) => onUpdate({ theme_button_color: color })} />
            <ColorField label="Button text" value={form.theme.button_text_color} onSave={(color) => onUpdate({ theme_button_text_color: color })} />
            <label className="flex h-10 items-center justify-between border-t border-admin-border-soft">
              <span className="text-admin-text">Font</span>
              <select
                value={form.theme.font}
                onChange={(event) => onUpdate({ theme_font: event.target.value })}
                className="h-8 rounded-lg border border-admin-border bg-white/80 px-2 text-admin-muted"
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
          <div className="grid grid-cols-3 gap-2 p-4">
            {GALLERY_THEMES.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => applyGalleryTheme(item.theme)}
                className="rounded-lg border border-admin-border p-3 text-left hover:border-admin-text"
                style={{ backgroundColor: item.theme.background_color }}
              >
                <span className="block text-[13px] font-medium" style={{ color: item.theme.question_color }}>
                  {item.name}
                </span>
                <span className="mt-3 block h-2 w-10 rounded-full" style={{ backgroundColor: item.theme.button_color }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PanelTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={"relative h-12 font-medium " + (isActive ? "text-admin-active" : "text-admin-muted hover:text-admin-active")}
    >
      {label}
      {isActive && <span className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-admin-active" />}
    </button>
  );
}

// Dragging inside a colour picker fires a change many times a second. Saving waits
// until the colour has stopped changing for this long.
const COLOR_SAVE_DELAY_MS = 400;

function ColorField({ label, value, onSave }: { label: string; value: string; onSave: (color: string) => void }) {
  // The colour chosen in this field since it was created, if any. It wins over the
  // saved `value` so the swatch does not flicker back while a save is in flight.
  // Applying a gallery theme recreates the field (new `key`), which clears it.
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const color = pickedColor ?? value;

  function handleChange(newColor: string) {
    setPickedColor(newColor);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => onSave(newColor.toUpperCase()), COLOR_SAVE_DELAY_MS);
  }

  return (
    <label className="flex h-10 items-center justify-between">
      <span className="text-admin-text">{label}</span>
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
