"use client";

/**
 * preview-screen.tsx — the preview at its own address, /forms/[id]/preview.
 *
 * What it does:   loads the form and shows the same preview overlay the builder's play
 *                 button opens. Closing it goes to the builder. Exists so a preview can
 *                 be opened directly or bookmarked.
 * Depends on:     preview-overlay.tsx, use-form-editor.ts,
 *                 respondent/form-message-screen.tsx.
 * Depended on by: app/forms/[id]/preview/page.tsx.
 */

import { useRouter } from "next/navigation";

import { FormMessageScreen } from "@/components/respondent/form-message-screen";

import { PreviewOverlay } from "./preview-overlay";
import { useFormEditor } from "./use-form-editor";

export function PreviewScreen({ formId }: { formId: number }) {
  const router = useRouter();
  const { form, isLoading } = useFormEditor(formId);

  if (isLoading) {
    return <FormMessageScreen title="Loading preview..." />;
  }
  if (form === undefined) {
    return <FormMessageScreen title="This form could not be found" />;
  }

  return <PreviewOverlay form={form} onClose={() => router.push(`/forms/${formId}/create`)} />;
}
