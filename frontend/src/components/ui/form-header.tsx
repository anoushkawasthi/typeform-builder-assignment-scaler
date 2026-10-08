"use client";

/**
 * form-header.tsx — the top bar of every screen that belongs to one form.
 *
 * What it does:   the "Forms › form name" breadcrumb (click the name to rename it), the
 *                 section links (Content, Workflow, Connect, Share, Results), and a slot
 *                 on the right for that screen's own buttons.
 * Depends on:     ui/modal.tsx, ui/button.tsx, next/link.
 * Depended on by: builder-screen.tsx, results-screen.tsx, form-section-placeholder.tsx.
 */

import { ChevronRight, LayoutList } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { Modal, ModalActions } from "./modal";

export type FormSection =
  "create" | "workflow" | "connect" | "share" | "results";

const SECTIONS: { id: FormSection; label: string }[] = [
  { id: "create", label: "Content" },
  { id: "workflow", label: "Workflow" },
  { id: "connect", label: "Connect" },
  { id: "share", label: "Share" },
  { id: "results", label: "Results" },
];

interface FormHeaderProps {
  formId: number;
  formTitle: string;
  activeSection: FormSection;
  /**
   * False until the form is published for the first time. Share and Results are
   * hidden until then, as in Typeform: there is nothing to share and no results yet.
   */
  hasBeenPublished: boolean;
  onRename: (title: string) => void;
  /** Buttons shown at the right end (e.g. the builder's Publish button). */
  actions?: ReactNode;
}

export function FormHeader({
  formId,
  formTitle,
  activeSection,
  hasBeenPublished,
  onRename,
  actions,
}: FormHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(formTitle);

  function openRename() {
    setDraftTitle(formTitle);
    setIsRenaming(true);
  }

  function submitRename(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draftTitle.trim();
    if (trimmed !== "" && trimmed !== formTitle) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  }

  const visibleSections = SECTIONS.filter(
    (section) =>
      hasBeenPublished || (section.id !== "share" && section.id !== "results"),
  );

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 px-4">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1 font-medium text-admin-muted"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-admin-hover"
        >
          <LayoutList aria-hidden="true" className="h-4 w-4" />
          Forms
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0" />
        <button
          type="button"
          onClick={openRename}
          title="Rename form"
          className="truncate rounded-md px-1 py-1 underline-offset-4 hover:text-admin-text hover:underline"
        >
          {formTitle}
        </button>
      </nav>

      {/* Centred on the page regardless of how wide the two sides are. */}
      <nav
        aria-label="Form sections"
        className="absolute left-1/2 top-0 hidden h-14 -translate-x-1/2 items-center gap-1 md:flex"
      >
        {visibleSections.map((section) => {
          const isActive = section.id === activeSection;
          return (
            <Link
              key={section.id}
              href={`/forms/${formId}/${section.id}`}
              aria-current={isActive ? "page" : undefined}
              className={
                "relative flex h-8 items-center rounded-lg px-3 font-medium hover:bg-admin-hover " +
                (isActive ? "text-admin-active" : "text-admin-muted")
              }
            >
              {section.label}
              {/* Typeform marks the active section with a short bar at the very top edge. */}
              {isActive && (
                <span className="absolute inset-x-3 -top-3 h-[2px] rounded-full bg-admin-active" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2">{actions}</div>

      <Modal
        isOpen={isRenaming}
        onClose={() => setIsRenaming(false)}
        title="Rename form"
      >
        <form onSubmit={submitRename}>
          <input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            maxLength={255}
            aria-label="Form name"
            onFocus={(event) => event.target.select()}
            className="h-[46px] w-full rounded-lg border border-admin-border bg-white px-3 text-[16px] text-admin-text outline-none focus:border-admin-text focus:shadow-[0_0_0_3px_var(--color-admin-ring)]"
          />
          <ModalActions>
            <Button onClick={() => setIsRenaming(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={draftTitle.trim() === ""}
            >
              Save
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </header>
  );
}
