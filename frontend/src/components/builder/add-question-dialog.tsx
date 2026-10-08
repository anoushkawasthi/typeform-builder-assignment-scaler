"use client";

/**
 * add-question-dialog.tsx — the "Add content" dialog.
 *
 * What it does:   lists the question types in Typeform's colour-coded groups, with a
 *                 search box. Picking one adds that question to the form.
 * Depends on:     ui/modal.tsx, ui/question-type-chip.tsx, ui/coming-soon.tsx,
 *                 lib/question-types.ts.
 * Depended on by: builder-screen.tsx.
 */

import { Search } from "lucide-react";
import { useState } from "react";

import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Modal } from "@/components/ui/modal";
import { IconTile, QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { COMING_SOON_TYPES, QUESTION_TYPES, QUESTION_TYPE_GROUPS } from "@/lib/question-types";
import type { QuestionType } from "@/lib/types";

interface AddQuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
}

export function AddQuestionDialog({ isOpen, onClose, onPick }: AddQuestionDialogProps) {
  const [searchText, setSearchText] = useState("");
  const search = searchText.trim().toLowerCase();

  function matchesSearch(label: string): boolean {
    return label.toLowerCase().includes(search);
  }

  function handleClose() {
    setSearchText("");
    onClose();
  }

  function handlePick(type: QuestionType) {
    setSearchText("");
    onPick(type);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add form elements" widthClass="max-w-[960px]" tone="panel">
      <div className="flex flex-col gap-8 rounded-xl bg-white p-8 sm:flex-row">
        {/* Left column: search, as in Typeform's dialog. */}
        <div className="shrink-0 sm:w-[208px]">
          <label className="flex h-8 w-full items-center gap-2 rounded-lg border border-admin-border px-3">
            <Search aria-hidden="true" className="h-4 w-4 text-admin-muted" />
            <input
              autoFocus
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search form elements"
              aria-label="Search form elements"
              className="w-full bg-transparent outline-none placeholder:text-admin-muted"
            />
          </label>
          <p className="mt-6 px-2 text-[13px] leading-5 text-admin-muted">
            Pick a question type to add it after the selected question.
          </p>
        </div>

        {/* Right: the question types in colour-coded groups. */}
        <div className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-8 lg:grid-cols-3">
          {QUESTION_TYPE_GROUPS.map((group) => {
            const visibleTypes = group.types.filter((type) => matchesSearch(QUESTION_TYPES[type].label));
            // "Other" also holds the two placeholder types the brief asks us to show.
            const placeholders = group.title === "Other" ? COMING_SOON_TYPES.filter((item) => matchesSearch(item.label)) : [];
            if (visibleTypes.length === 0 && placeholders.length === 0) {
              return null;
            }
            return (
              <section key={group.title}>
                <h3 className="mb-2 px-2 font-medium text-admin-text">{group.title}</h3>
                <ul>
                  {visibleTypes.map((type) => (
                    <li key={type}>
                      <button
                        type="button"
                        onClick={() => handlePick(type)}
                        className="flex h-9 w-full items-center gap-3 rounded-lg pl-2 pr-3 text-left text-admin-muted hover:bg-admin-hover"
                      >
                        <QuestionTypeIcon type={type} />
                        {QUESTION_TYPES[type].label}
                      </button>
                    </li>
                  ))}
                  {placeholders.map((item) => (
                    <li key={item.label} className="flex h-9 items-center gap-3 pl-2 pr-1 text-admin-muted opacity-60">
                      <IconTile color={item.color} icon={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      <ComingSoonBadge />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
