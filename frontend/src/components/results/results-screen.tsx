"use client";

/**
 * results-screen.tsx — the Results tab of a form.
 *
 * What it does:   loads the summary and the responses, and switches between the
 *                 "Form performance", "Response summary" and "Responses" sub-tabs.
 * Depends on:     performance-tab.tsx, summary-tab.tsx, responses-tab.tsx, ui/form-header.tsx, lib/api.ts,
 *                 builder/use-form-editor.ts (for the form's title and renaming).
 * Depended on by: app/forms/[id]/results/page.tsx.
 */

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useFormEditor } from "@/components/builder/use-form-editor";
import { FormHeader } from "@/components/ui/form-header";
import { getResponses, getSummary } from "@/lib/api";

import { PerformanceTab } from "./performance-tab";
import { ResponsesTab } from "./responses-tab";
import { SummaryTab } from "./summary-tab";

type ResultsTab = "performance" | "summary" | "responses";

export function ResultsScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const [activeTab, setActiveTab] = useState<ResultsTab>("performance");

  const summaryQuery = useQuery({ queryKey: ["summary", formId], queryFn: () => getSummary(formId) });
  const responsesQuery = useQuery({ queryKey: ["responses", formId], queryFn: () => getResponses(formId) });

  const responseCount = responsesQuery.data?.responses.length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <FormHeader
        formId={formId}
        formTitle={editor.form?.title ?? "..."}
        activeSection="results"
        hasBeenPublished={(editor.form?.published_at ?? null) !== null}
        onRename={(title) => editor.updateForm({ title })}
      />

      <main className="mx-4 mb-4 flex-1 overflow-hidden rounded-xl bg-admin-panel">
        <div role="tablist" className="flex gap-6 border-b border-white px-8">
          <SubTab
            label="Form performance"
            isActive={activeTab === "performance"}
            onClick={() => setActiveTab("performance")}
          />
          <SubTab label="Response summary" isActive={activeTab === "summary"} onClick={() => setActiveTab("summary")} />
          <SubTab
            label={`Responses [${responseCount}]`}
            isActive={activeTab === "responses"}
            onClick={() => setActiveTab("responses")}
          />
        </div>

        <div className="p-4 sm:p-8">
          {activeTab === "performance" &&
            (summaryQuery.data === undefined ? (
              <p className="text-admin-muted">{summaryQuery.isError ? "Could not load the numbers." : "Loading..."}</p>
            ) : (
              <PerformanceTab summary={summaryQuery.data} />
            ))}

          {activeTab === "summary" &&
            (summaryQuery.data === undefined ? (
              <p className="text-admin-muted">{summaryQuery.isError ? "Could not load the summary." : "Loading..."}</p>
            ) : (
              <SummaryTab summary={summaryQuery.data} />
            ))}

          {activeTab === "responses" &&
            (responsesQuery.data === undefined ? (
              <p className="text-admin-muted">{responsesQuery.isError ? "Could not load responses." : "Loading..."}</p>
            ) : (
              <ResponsesTab formId={formId} table={responsesQuery.data} />
            ))}
        </div>
      </main>
    </div>
  );
}

function SubTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={
        "relative h-14 font-medium " + (isActive ? "text-admin-active" : "text-admin-muted hover:text-admin-active")
      }
    >
      {label}
      {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-admin-active" />}
    </button>
  );
}
