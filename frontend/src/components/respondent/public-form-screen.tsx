"use client";

/**
 * public-form-screen.tsx — the page a respondent opens from a shared link.
 *
 * What it does:   loads the published form, records that the respondent started, and
 *                 sends the answers when they submit. The actual form UI is FormFlow.
 * Depends on:     form-flow.tsx, form-message-screen.tsx, lib/api.ts.
 * Depended on by: app/to/[publicId]/page.tsx.
 */

import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

import { getPublicForm, startResponse, submitResponse } from "@/lib/api";
import type { AnswerPayload } from "@/lib/types";

import { FormFlow } from "./form-flow";
import { FormMessageScreen } from "./form-message-screen";

export function PublicFormScreen({ publicId }: { publicId: string }) {
  const formQuery = useQuery({
    queryKey: ["public-form", publicId],
    queryFn: () => getPublicForm(publicId),
    // A missing or unpublished form will not appear by asking again.
    retry: false,
  });

  // The "start" request returns a token that the submit request needs. We keep the
  // promise, not the token, so submit can wait for it if the respondent is very quick.
  const tokenPromiseRef = useRef<Promise<string> | null>(null);

  function beginResponse(): Promise<string> {
    if (tokenPromiseRef.current === null) {
      tokenPromiseRef.current = startResponse(publicId).then((result) => result.token);
    }
    return tokenPromiseRef.current;
  }

  async function handleSubmit(answers: AnswerPayload[]) {
    const token = await beginResponse();
    await submitResponse(token, answers);
  }

  if (formQuery.isPending) {
    return <FormMessageScreen title="Loading..." />;
  }

  if (formQuery.isError) {
    return (
      <FormMessageScreen
        title="This form isn't accepting responses"
        text="It may have been closed by its creator, or the link may be incorrect."
      />
    );
  }

  return <FormFlow form={formQuery.data} onStart={() => void beginResponse()} onSubmit={handleSubmit} />;
}
