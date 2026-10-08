"use client";

/**
 * placeholder-section-screen.tsx — the Workflow and Connect tabs.
 *
 * What it does:   shows the normal form header with a "Coming soon" panel underneath.
 *                 The brief lists logic jumps and integrations as placeholder features.
 * Depends on:     use-form-editor.ts, ui/form-header.tsx, ui/coming-soon.tsx.
 * Depended on by: app/forms/[id]/workflow/page.tsx, app/forms/[id]/connect/page.tsx.
 */

import { GitBranch, Plug } from "lucide-react";

import { ComingSoonPanel } from "@/components/ui/coming-soon";
import { FormHeader } from "@/components/ui/form-header";

import { useFormEditor } from "./use-form-editor";

const SECTION_CONTENT = {
  workflow: {
    icon: GitBranch,
    title: "Logic jumps and branching",
    text: "Send respondents to different questions depending on their answers.",
  },
  connect: {
    icon: Plug,
    title: "Integrations and webhooks",
    text: "Send new responses to other tools such as spreadsheets, CRMs and chat apps.",
  },
};

interface PlaceholderSectionScreenProps {
  formId: number;
  section: "workflow" | "connect";
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
