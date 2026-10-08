"use client";

/**
 * placeholder-section-screen.tsx — the Connect tab.
 *
 * What it does:   shows the normal form header with a "Coming soon" panel underneath.
 *                 The brief lists integrations and webhooks as a placeholder feature.
 * Depends on:     use-form-editor.ts, ui/form-header.tsx, ui/coming-soon.tsx.
 * Depended on by: app/forms/[id]/connect/page.tsx.
 */

import { Plug } from "lucide-react";

import { ComingSoonPanel } from "@/components/ui/coming-soon";
import { FormHeader } from "@/components/ui/form-header";

import { useFormEditor } from "./use-form-editor";

const SECTION_CONTENT = {
  connect: {
    icon: Plug,
    title: "Integrations and webhooks",
    text: "Send new responses to other tools such as spreadsheets, CRMs and chat apps.",
  },
};

interface PlaceholderSectionScreenProps {
  formId: number;
  section: "connect";
}

export function PlaceholderSectionScreen({ formId, section }: PlaceholderSectionScreenProps) {
  const editor = useFormEditor(formId);
  const content = SECTION_CONTENT[section];

  return (
    <div className="flex min-h-dvh flex-col">
      <FormHeader
        formId={formId}
        formTitle={editor.form?.title ?? "..."}
        activeSection={section}
        onRename={(title) => editor.updateForm({ title })}
      />
      <main className="mx-4 mb-4 flex-1">
        <ComingSoonPanel icon={content.icon} title={content.title} text={content.text} />
      </main>
    </div>
  );
}
