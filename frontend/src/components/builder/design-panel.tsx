"use client";

/**
 * design-panel.tsx — the floating Design panel: the form's theme.
 *
 * What it does:   laid out like Typeform's. The first view has two tabs: "My themes"
 *                 (this form's theme as a small preview card) and "Gallery" (ready-made
 *                 themes as the same cards). Clicking this form's card opens "Design ›
 *                 My theme" with Font, Buttons and Background tabs. The panel floats
 *                 over the builder, can be dragged by its grip, and the canvas behind
 *                 it recolours live.
 * Depends on:     respondent/form-theme.tsx (font list), ui/button.tsx, ui/menu.tsx,
 *                 lib/types.ts.
 * Depended on by: builder-screen.tsx.
 *
 * Changes save themselves as they are made, like everything else in the builder, so
 * the button at the bottom of the editor is "Done", not "Save changes".
 */

import { ChevronDown, ChevronRight, Droplet, GripVertical, MoreHorizontal, Pencil, X } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { THEME_FONTS } from "@/components/respondent/form-theme";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import type { FormDetail, FormUpdate, Theme } from "@/lib/types";

interface DesignPanelProps {
  form: FormDetail;
  onUpdate: (changes: FormUpdate) => void;
  onClose: () => void;
}

type HomeTab = "my-themes" | "gallery";
type EditorTab = "font" | "buttons" | "background";

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

// The ready-made colours offered in the colour pop-up, as in Typeform's.
const SWATCHES = ["#89A32D", "#5CD2C6", "#FBCB3C", "#FB7310", "#3B9BFB", "#D85C9E", "#551A4B", "#0A6857", "#0F8FB8"];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const PICKER_SAVE_DELAY_MS = 400;

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

/** True when two themes have the same colours and font. */
function isSameTheme(first: Theme, second: Theme): boolean {
  return (
    first.background_color.toUpperCase() === second.background_color.toUpperCase() &&
    first.question_color.toUpperCase() === second.question_color.toUpperCase() &&
    first.answer_color.toUpperCase() === second.answer_color.toUpperCase() &&
    first.button_color.toUpperCase() === second.button_color.toUpperCase() &&
    first.button_text_color.toUpperCase() === second.button_text_color.toUpperCase() &&
    first.font === second.font
  );
}

export function DesignPanel({ form, onUpdate, onClose }: DesignPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeTab>("my-themes");
  const [editorTab, setEditorTab] = useState<EditorTab>("font");

  // How far the panel has been dragged from where it first appeared.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLElement>(null);
  // Where the pointer and the panel were when the current drag began.
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    offsetX: number;
    offsetY: number;
    panelLeft: number;
    panelTop: number;
    panelWidth: number;
    panelHeight: number;
  } | null>(null);

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const box = panel.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
      panelLeft: box.left,
      panelTop: box.top,
      panelWidth: box.width,
      panelHeight: box.height,
    };
    // "Capturing" the pointer keeps the move events coming to the grip even when the
    // pointer travels outside it, so no window-level listeners are needed.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    if (start === null) {
      return;
    }
    let moveX = event.clientX - start.pointerX;
    let moveY = event.clientY - start.pointerY;

    // Keep the whole panel inside the window on all four sides. (Letting part of it
    // hang below the bottom edge made the page itself grow and scroll.)
    const margin = 8;
    const minMoveX = margin - start.panelLeft;
    const maxMoveX = window.innerWidth - margin - start.panelWidth - start.panelLeft;
    const minMoveY = margin - start.panelTop;
    const maxMoveY = window.innerHeight - margin - start.panelHeight - start.panelTop;
    // The outer Math.max covers a panel bigger than the window: then it stays at the
    // top-left limit instead of jumping about.
    moveX = Math.min(Math.max(moveX, minMoveX), Math.max(maxMoveX, minMoveX));
    moveY = Math.min(Math.max(moveY, minMoveY), Math.max(maxMoveY, minMoveY));

    setOffset({ x: start.offsetX + moveX, y: start.offsetY + moveY });
  }

  function endDrag() {
    dragStartRef.current = null;
  }

  return (
    <section
      ref={panelRef}
      aria-label="Design"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className="absolute left-[140px] top-[44px] z-30 w-[544px] max-w-[calc(100%-16px)] rounded-xl border border-admin-border bg-white p-[7px] shadow-[0_0_0_3px_var(--color-admin-ring)]"
    >
      {/* 40px tall. The grip and the close button are 24px squares 12px from the
          panel's corners; the title sits 2px lower. All measured on Typeform's panel. */}
      <header className="flex h-10 items-start justify-between">
        <div className="flex items-start gap-2 pl-1 pt-1 text-admin-text">
          <button
            type="button"
            aria-label="Drag to move the Design panel"
            title="Drag to move"
            onPointerDown={startDrag}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            // touch-none: on touch screens, dragging the grip must not scroll the page.
            className="flex h-6 w-6 touch-none items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
            style={{ cursor: "grab" }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {isEditing ? (
            <div className="flex items-center pt-[2px] font-medium text-admin-muted">
              <button type="button" onClick={() => setIsEditing(false)} className="hover:underline">
                Design
              </button>
              <ChevronRight aria-hidden="true" className="mx-[2px] h-[13px] w-[13px]" />
              <h2>My theme</h2>
            </div>
          ) : (
            <h2 className="pt-[2px] font-medium text-admin-active">Design</h2>
          )}
        </div>
        <button
          type="button"
          aria-label="Close design panel"
          onClick={onClose}
          className="mr-1 mt-1 flex h-6 w-6 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="rounded-xl bg-admin-panel">
        {isEditing ? (
          <>
            <div role="tablist" className={TAB_STRIP_CLASSES}>
              <PanelTab label="Font" isActive={editorTab === "font"} onClick={() => setEditorTab("font")} />
              <PanelTab label="Buttons" isActive={editorTab === "buttons"} onClick={() => setEditorTab("buttons")} />
              <PanelTab label="Background" isActive={editorTab === "background"} onClick={() => setEditorTab("background")} />
            </div>

            <div className="px-5 pb-5 pt-4">
              {editorTab === "font" && (
                <>
                  <h3 className="font-medium text-admin-text">Font</h3>
                  <select
                    aria-label="Font"
                    value={form.theme.font}
                    onChange={(event) => onUpdate({ theme_font: event.target.value })}
                    className="mt-4 h-8 w-full rounded-lg border border-admin-border bg-white/80 px-2 text-admin-muted"
                  >
                    {Object.keys(THEME_FONTS).map((fontName) => (
                      <option key={fontName} value={fontName}>
                        {fontName}
                      </option>
                    ))}
                  </select>
                  <h3 className="mb-2 mt-4 border-t border-admin-border pt-4 font-medium text-admin-text">Color</h3>
                  <ColorRow
                    label="Titles and questions"
                    value={form.theme.question_color}
                    onSave={(color) => onUpdate({ theme_question_color: color })}
                  />
                </>
              )}

              {editorTab === "buttons" && (
                <>
                  <h3 className="mb-2 font-medium text-admin-text">Color</h3>
                  <ColorRow label="Buttons" value={form.theme.button_color} onSave={(color) => onUpdate({ theme_button_color: color })} />
                  <ColorRow
                    label="Button text"
                    value={form.theme.button_text_color}
                    onSave={(color) => onUpdate({ theme_button_text_color: color })}
                  />
                  <ColorRow label="Answers" value={form.theme.answer_color} onSave={(color) => onUpdate({ theme_answer_color: color })} />
                </>
              )}

              {editorTab === "background" && (
                <>
                  <h3 className="mb-2 font-medium text-admin-text">Color</h3>
                  <ColorRow
                    label="Background"
                    value={form.theme.background_color}
                    onSave={(color) => onUpdate({ theme_background_color: color })}
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div role="tablist" className={TAB_STRIP_CLASSES}>
              <PanelTab label="My themes" isActive={homeTab === "my-themes"} onClick={() => setHomeTab("my-themes")} />
              <PanelTab label="Gallery" isActive={homeTab === "gallery"} onClick={() => setHomeTab("gallery")} />
            </div>

            {homeTab === "my-themes" ? (
              <div className="px-5 pb-2 pt-5">
                <h3 className="font-medium text-admin-text">My themes</h3>
                {/* A form has one theme of its own. Clicking its card opens the editor. */}
                <div className="mt-[22px] grid grid-cols-2 gap-4">
                  <ThemeCard name="My theme" theme={form.theme} isSelected={false} onPick={() => setIsEditing(true)}>
                    <Menu
                      align="start"
                      sizeClassName="p-2"
                      trigger={
                        <button
                          type="button"
                          aria-label="Theme actions"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-admin-muted hover:bg-admin-hover"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      }
                    >
                      <MenuItem onSelect={() => setIsEditing(true)}>
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        Edit
                      </MenuItem>
                    </Menu>
                  </ThemeCard>
                </div>
              </div>
            ) : (
              // As tall as Typeform's list, then it scrolls.
              <div className="grid max-h-[438px] grid-cols-2 gap-4 overflow-y-auto px-5 pb-2 pt-4">
                {GALLERY_THEMES.map((item) => (
                  <ThemeCard
                    key={item.name}
                    name={item.name}
                    theme={item.theme}
                    isSelected={isSameTheme(item.theme, form.theme)}
                    onPick={() => onUpdate(themeToUpdate(item.theme))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {isEditing && (
        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={() => setIsEditing(false)}>
            Done
          </Button>
        </div>
      )}
    </section>
  );
}

// The strip the tabs sit in: 48px, then a 2px white line under it.
const TAB_STRIP_CLASSES = "flex h-[50px] items-start gap-[2px] border-b-2 border-white px-2";

function PanelTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={
        "relative mt-[10px] h-7 rounded-lg px-2 font-medium " +
        (isActive ? "text-admin-active" : "text-admin-muted hover:text-admin-active")
      }
    >
      {label}
      {/* The marker of the open tab: a 3px bar under its text, at the bottom of the strip. */}
      {isActive && <span className="absolute inset-x-2 -bottom-[10px] h-[3px] bg-admin-active" />}
    </button>
  );
}

interface ThemeCardProps {
  name: string;
  theme: Theme;
  /** Draws the dark outline that marks the theme the form is using. */
  isSelected: boolean;
  onPick: () => void;
  /** An optional "..." menu, placed at the right of the name. */
  children?: ReactNode;
}

/**
 * A theme shown the way Typeform shows one: a small sample in the theme's own colours
 * (the words "Question" and "Answer" and a block in the button colour), with the
 * theme's name underneath.
 */
function ThemeCard({ name, theme, isSelected, onPick, children }: ThemeCardProps) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-xl bg-white " +
        (isSelected ? "shadow-[0_0_0_2px_var(--color-admin-text)]" : "shadow-[0_0_0_1px_var(--color-admin-border)]")
      }
    >
      <button type="button" aria-label={`${name} theme`} aria-pressed={isSelected} onClick={onPick} className="block w-full text-left">
        <span className="block h-[110px] p-5" style={{ backgroundColor: theme.background_color }}>
          <span className="block font-medium leading-5" style={{ color: theme.question_color }}>
            Question
          </span>
          <span className="block leading-5" style={{ color: theme.answer_color }}>
            Answer
          </span>
          <span className="mt-3 block h-[18px] w-10 rounded-[4px]" style={{ backgroundColor: theme.button_color }} />
        </span>
        <span className="flex h-12 items-center px-2 font-medium text-admin-text">{name}</span>
      </button>
      {children !== undefined && <div className="absolute bottom-2 right-2">{children}</div>}
    </div>
  );
}

interface ColorRowProps {
  label: string;
  /** The saved colour, as "#RRGGBB". */
  value: string;
  onSave: (color: string) => void;
}

/**
 * One colour setting: a label and a droplet button showing the colour. The button
 * opens a small pop-up with ready-made swatches and a hex field.
 */
function ColorRow({ label, value, onSave }: ColorRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  // What is typed in the hex field. It may be half-finished ("#12"), so it is kept
  // apart from the saved colour and only saved once it is a complete hex colour.
  const [hexDraft, setHexDraft] = useState(value);

  function open() {
    setHexDraft(value);
    setIsOpen(true);
  }

  // Dragging inside the browser's colour picker reports a new colour many times a
  // second; this timer makes us save only once the colour has stopped changing.
  const saveTimerRef = useRef<number | null>(null);

  function choose(color: string) {
    setHexDraft(color);
    onSave(color.toUpperCase());
  }

  function chooseFromPicker(color: string) {
    setHexDraft(color);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => onSave(color.toUpperCase()), PICKER_SAVE_DELAY_MS);
  }

  function handleHexChange(text: string) {
    setHexDraft(text);
    if (HEX_COLOR.test(text)) {
      onSave(text.toUpperCase());
    }
  }

  return (
    <div className="relative flex h-12 items-center justify-between">
      <span className="text-admin-muted">{label}</span>
      <button
        type="button"
        aria-label={`${label} colour`}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className="flex h-8 items-center gap-2 rounded-[4px] border border-admin-border bg-white px-1"
      >
        <Droplet aria-hidden="true" className="h-4 w-4" style={{ fill: value, color: "#3c323e" }} />
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-admin-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-40 w-[224px] rounded-xl border border-admin-border bg-white p-3 shadow-[0_8px_24px_rgba(60,50,62,0.18)]">
          <div className="flex items-center gap-2">
            {/* The browser's own picker, for any colour not among the swatches. */}
            <input
              type="color"
              aria-label="Pick any colour"
              value={HEX_COLOR.test(hexDraft) ? hexDraft : value}
              onChange={(event) => chooseFromPicker(event.target.value)}
              className="h-8 w-9 shrink-0 rounded border border-admin-border bg-white p-[2px]"
            />
            <input
              type="text"
              aria-label="Hex colour"
              value={hexDraft}
              maxLength={7}
              onChange={(event) => handleHexChange(event.target.value)}
              className="h-8 w-full rounded-lg border border-admin-border px-2 uppercase text-admin-text outline-none focus:border-admin-text"
            />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Use ${swatch}`}
                onClick={() => choose(swatch)}
                className="h-8 rounded-md border border-admin-border-soft"
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
