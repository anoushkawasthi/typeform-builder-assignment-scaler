"use client";

/**
 * preview-screen.tsx — try the whole form before publishing it.
 *
 * What it does:   loads the DRAFT of a form and runs it through the same FormFlow the
 *                 public form uses, but with a submit that saves nothing.
 * Depends on:     respondent/form-flow.tsx, respondent/form-message-screen.tsx,
 *                 use-form-editor.ts.
 * Depended on by: app/forms/[id]/preview/page.tsx.
 */

import { RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FormFlow } from "@/components/respondent/form-flow";
import { FormMessageScreen } from "@/components/respondent/form-message-screen";
import type { FillableForm } from "@/lib/types";

import { useFormEditor } from "./use-form-editor";

export function PreviewScreen({ formId }: { formId: number }) {
  const { form, isLoading } = useFormEditor(formId);
  // Changing this number remounts FormFlow, which is the simplest way to start over.
  const [restartCount, setRestartCount] = useState(0);

  if (isLoading) {
    return <FormMessageScreen title="Loading preview..." />;
  }
  if (form === undefined) {
    return <FormMessageScreen title="This form could not be found" />;
  }

  // The draft has everything a published form has, so it can be previewed as is.
  const fillableForm: FillableForm = {
    title: form.title,
    theme: form.theme,
    thank_you_title: form.thank_you_title,
    thank_you_text: form.thank_you_text,
    questions: form.questions,
  };

  return (
    <>
      <FormFlow
        key={restartCount}
        form={fillableForm}
        // Nothing is sent anywhere: the preview only pretends to submit.
        onSubmit={async () => {}}
      />

      {/* A small bar above the form so it is obvious this is not the live link. */}
      <div className="fixed left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-admin-text py-1 pl-3 pr-1 text-[13px] text-white">
        Preview — answers are not saved
        <button
          type="button"
          onClick={() => setRestartCount((count) => count + 1)}
          aria-label="Restart preview"
          title="Restart"
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/15"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <Link
          href={`/forms/${formId}/create`}
          aria-label="Back to the builder"
          title="Back to the builder"
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
