"use client";

/**
 * responses-tab.tsx — the "Responses" tab of the results page.
 *
 * What it does:   a table with one row per submission and one column per question, a
 *                 CSV download, and a dialog showing a single response in full when a
 *                 row is clicked.
 * Depends on:     ui/modal.tsx, ui/question-type-chip.tsx, lib/api.ts, lib/types.ts.
 * Depended on by: results-screen.tsx.
 */

import { Download } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { QuestionTypeChip, QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { responsesCsvUrl } from "@/lib/api";
import type { ResponseOut, ResponsesTable } from "@/lib/types";

interface ResponsesTabProps {
  formId: number;
  table: ResponsesTable;
}

/** "Oct 9, 2026, 12:45 AM" in the viewer's own time zone. */
function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** The printable answer a response gave to one question, or an en dash if it gave none. */
function answerDisplay(response: ResponseOut, questionId: number): string {
  const answer = response.answers.find((item) => item.question_id === questionId);
  if (answer === undefined || answer.display === "") {
    return "–";
  }
  return answer.display;
}

export function ResponsesTab({ formId, table }: ResponsesTabProps) {
  const [openResponse, setOpenResponse] = useState<ResponseOut | null>(null);
  const { questions, responses } = table;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-[24px] leading-8 text-admin-text">
          Responses <span className="text-admin-muted">[{responses.length}]</span>
        </h1>
        {/* A plain link: the server sends the file with a "download" header. */}
        <a
          href={responsesCsvUrl(formId)}
          className="flex h-8 items-center gap-2 rounded-lg border border-admin-border bg-white/80 px-3 font-medium text-admin-muted hover:bg-admin-hover"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center">
          <h2 className="text-[21px] leading-7 text-admin-text">No responses yet</h2>
          <p className="mt-2 text-admin-muted">Submissions will be listed here as they arrive.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="sticky left-0 bg-white px-4 py-3 font-normal text-admin-muted">Submitted</th>
                {questions.map((question) => (
                  <th key={question.id} className="min-w-[200px] max-w-[280px] px-4 py-3 font-normal text-admin-text">
                    <span className="flex items-center gap-2">
                      <QuestionTypeIcon type={question.type} />
                      <span className="truncate">{question.title === "" ? "..." : question.title}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr
                  key={response.id}
                  tabIndex={0}
                  onClick={() => setOpenResponse(response)}
                  onKeyDown={(event) => event.key === "Enter" && setOpenResponse(response)}
                  className="cursor-pointer border-b border-admin-border-soft last:border-b-0 hover:bg-admin-hover"
                >
                  <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-3 text-admin-muted">
                    {formatDateTime(response.submitted_at)}
                  </td>
                  {questions.map((question) => (
                    <td key={question.id} className="max-w-[280px] truncate px-4 py-3 text-admin-text">
                      {answerDisplay(response, question.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={openResponse !== null}
        onClose={() => setOpenResponse(null)}
        title="Response"
        description={openResponse === null ? undefined : `Submitted ${formatDateTime(openResponse.submitted_at)}`}
        widthClass="max-w-[560px]"
      >
        {openResponse !== null && (
          <ol className="flex flex-col gap-3">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-xl bg-white p-4">
                <div className="flex items-start gap-3">
                  <QuestionTypeChip type={question.type} number={index + 1} />
                  <p className="font-medium text-admin-text">{question.title === "" ? "..." : question.title}</p>
                </div>
                <p className="mt-2 whitespace-pre-line pl-[60px] text-admin-text">
                  {answerDisplay(openResponse, question.id)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </div>
  );
}
