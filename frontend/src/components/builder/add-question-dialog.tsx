"use client";

/**
 * add-question-dialog.tsx — the "Add content" dialog.
 *
 * What it does:   lists the question types in Typeform's colour-coded groups, with a
 *                 search box and a short "Recommended" list. Picking one adds that
 *                 question to the form. The strip of tabs at the top is Typeform's; only
 *                 the first tab does anything.
 * Depends on:     ui/modal.tsx, ui/question-type-chip.tsx, ui/coming-soon.tsx,
 *                 lib/question-types.ts, sonner.
 * Depended on by: builder-screen.tsx.
 */

import { PanelLeftOpen, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Modal } from "@/components/ui/modal";
import { IconTile, QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { COMING_SOON_TYPES, QUESTION_TYPES, QUESTION_TYPE_GROUPS } from "@/lib/question-types";
import type { QuestionType } from "@/lib/types";

interface AddQuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (type: QuestionType) => void;
  /** Add a welcome screen. Left out when the form already has one. */
  onPickWelcome?: () => void;
}

// The two types Typeform's "Recommended" list offers that this app has.
const RECOMMENDED_TYPES: QuestionType[] = ["multiple_choice", "short_text"];

// One entry in the lists on the right: an icon tile and a name, 36px tall.
const ITEM_CLASSES = "flex h-9 w-full items-center gap-[10px] rounded-lg pl-2 pr-3 text-left text-admin-muted";

export function AddQuestionDialog({ isOpen, onClose, onPick, onPickWelcome }: AddQuestionDialogProps) {
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

  const recommendedTypes = RECOMMENDED_TYPES.filter((type) => matchesSearch(QUESTION_TYPES[type].label));
  const showWelcome = onPickWelcome !== undefined && matchesSearch("Welcome Screen");

  // Typeform's dialog has three tabs. Importing questions and writing a form with AI
  // are outside the brief, so those two only say so.
  const tabs = (
    <div className="flex h-14 items-center gap-1 pl-8">
      <span className="relative flex h-8 items-center rounded-lg px-3 font-medium text-admin-active">
        {/* The same marker the page tabs use: a short bar on the top edge. */}
        <span className="absolute inset-x-3 -top-3 h-[2px] rounded-full bg-admin-active" />
        Add form elements
      </span>
      <button
        type="button"
        onClick={() => toast("Importing questions is coming soon")}
        className="flex h-8 items-center rounded-lg px-3 font-medium text-admin-muted hover:bg-admin-hover"
      >
        Import questions
      </button>
      <button
        type="button"
        onClick={() => toast("Creating with AI is coming soon")}
        className="flex h-8 items-center rounded-lg px-3 font-medium text-admin-muted hover:bg-admin-hover"
      >
        Create with AI
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add form elements" widthClass="max-w-[960px]" header={tabs}>
      {/* The white area starts 16px in from the left and runs to the right and bottom
          edges of the dialog, as in Typeform's. */}
      <div className="ml-4 flex min-h-[400px] flex-col gap-8 rounded-l-xl bg-white p-8 sm:flex-row">
        {/* Left column: search, then the types Typeform recommends. */}
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
          {recommendedTypes.length > 0 && (
            <>
              <h3 className="mb-[10px] mt-[30px] px-2 font-medium text-admin-text">Recommended</h3>
              <ul className="flex flex-col gap-1">
                {recommendedTypes.map((type) => (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() => handlePick(type)}
                      className="flex h-[38px] w-full items-center gap-[10px] rounded-lg border border-admin-border pl-2 pr-3 text-left text-admin-muted hover:bg-admin-hover"
                    >
                      <QuestionTypeIcon type={type} />
                      {QUESTION_TYPES[type].label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Right: the question types in colour-coded groups, three columns. */}
        <div className="grid flex-1 grid-cols-2 content-start gap-4 lg:grid-cols-3">
          {QUESTION_TYPE_GROUPS.map((group) => {
            const visibleTypes = group.types.filter((type) => matchesSearch(QUESTION_TYPES[type].label));
            // "Other" also holds the two placeholder types the brief asks us to show.
            const placeholders = group.title === "Other" ? COMING_SOON_TYPES.filter((item) => matchesSearch(item.label)) : [];
            if (visibleTypes.length === 0 && placeholders.length === 0) {
              return null;
            }
            return (
              <section key={group.title} className="pt-[10px]">
                <h3 className="mb-[10px] px-2 font-medium text-admin-text">{group.title}</h3>
                <ul className="flex flex-col gap-1">
                  {visibleTypes.map((type) => (
                    <li key={type}>
                      <button type="button" onClick={() => handlePick(type)} className={`${ITEM_CLASSES} hover:bg-admin-hover`}>
                        <QuestionTypeIcon type={type} />
                        {QUESTION_TYPES[type].label}
                      </button>
                    </li>
                  ))}
                  {placeholders.map((item) => (
                    <li key={item.label} className={`${ITEM_CLASSES} opacity-60`}>
                      <IconTile color={item.color} icon={item.icon} />
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      <ComingSoonBadge isShort />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* Typeform keeps the screens that are not questions in a last group with no
              heading. Ours has one: the welcome screen, while the form has none. */}
          {showWelcome && (
            <section className="pt-[10px]">
              <h3 aria-hidden="true" className="mb-[10px] px-2 font-medium">
                &nbsp;
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  onPickWelcome();
                }}
                className={`${ITEM_CLASSES} hover:bg-admin-hover`}
              >
                <IconTile color="#DEDCDE" icon={PanelLeftOpen} />
                Welcome Screen
              </button>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}
