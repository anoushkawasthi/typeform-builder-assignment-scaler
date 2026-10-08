"use client";

/**
 * responses-tab.tsx — the "Responses" tab of the results page.
 *
 * What it does:   a table with one row per submission and one column per question, a
 *                 search box, a CSV download, and a dialog showing a single response in
 *                 full when a row is clicked.
 * Depends on:     ui/modal.tsx, ui/question-type-chip.tsx, lib/api.ts, lib/types.ts.
 * Depended on by: results-screen.tsx.
 */

import { Clock, Download, Filter, Inbox, Search } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { IconTile, QuestionTypeChip, QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { responsesCsvUrl } from "@/lib/api";
import type { AnswerOut, ResponseOut, ResponsesTable } from "@/lib/types";

interface ResponsesTabProps {
  formId: number;
  table: ResponsesTable;
}

/** "Oct 9, 2026" in the viewer's own time zone. */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "12:45 AM" in the viewer's own time zone. */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function findAnswer(response: ResponseOut, questionId: number): AnswerOut | undefined {
  return response.answers.find((answer) => answer.question_id === questionId);
}

/** True when any answer of the response contains the search text. */
function responseMatches(response: ResponseOut, search: string): boolean {
  if (search === "") {
    return true;
  }
  return response.answers.some((answer) => answer.display.toLowerCase().includes(search));
}

/** One table cell: choices as small outlined tags, other answers as text, "–" if none. */
function AnswerCell({ answer }: { answer: AnswerOut | undefined }) {
  if (answer === undefined || answer.display === "") {
    return <span className="text-admin-muted">–</span>;
  }
  if (answer.choice_labels.length > 0) {
    return (
      <span className="flex flex-wrap gap-1">
        {answer.choice_labels.map((label) => (
          <span key={label} className="rounded-[4px] border border-admin-muted/60 px-2 py-[1px] text-[12px] text-admin-text">
            {label}
          </span>
        ))}
      </span>
    );
  }
  return <span className="line-clamp-2">{answer.display}</span>;
}

export function ResponsesTab({ formId, table }: ResponsesTabProps) {
  const [openResponse, setOpenResponse] = useState<ResponseOut | null>(null);
  const [searchText, setSearchText] = useState("");

  const { questions, responses } = table;
  const search = searchText.trim().toLowerCase();
  const visibleResponses = responses.filter((response) => responseMatches(response, search));

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex h-8 items-center gap-2 rounded-lg bg-white/80 px-3 text-admin-active shadow-[inset_0_0_0_1px_var(--color-admin-border)]">
          <Inbox aria-hidden="true" className="h-4 w-4" />
          Responses
        </span>
        <label className="flex h-8 w-[200px] items-center gap-2 rounded-lg border border-admin-border bg-white/80 px-3 text-admin-muted">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search responses"
            aria-label="Search responses"
            className="w-full bg-transparent text-admin-text outline-none placeholder:text-admin-muted"
          />
        </label>
        {/* A plain link: the server sends the file with a "download" header. */}
        <a
          href={responsesCsvUrl(formId)}
          title="Download responses as CSV"
          className="ml-auto flex h-8 items-center gap-2 rounded-lg border border-admin-border bg-white/80 px-3 font-medium text-admin-muted hover:bg-admin-hover"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center">
          <h2 className="text-[24px] leading-8 text-admin-text">Waiting for responses</h2>
          <p className="mt-2 text-[16px] text-admin-muted">Submissions will be listed here as they arrive.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="sticky left-0 z-10 w-[130px] border-r border-admin-border bg-white px-4 py-3 font-normal">
                  <span className="flex items-center gap-3 text-[13px] leading-4 text-admin-text">
                    <IconTile color="#DEDCDE" icon={Clock} />
                    Response time
                  </span>
                </th>
                <th className="w-[160px] border-r border-admin-border px-4 py-3 font-normal">
                  <span className="flex items-center gap-3 text-[13px] text-admin-text">
                    <IconTile color="#DEDCDE" icon={Filter} />
                    Response type
                  </span>
                </th>
                {questions.map((question) => (
                  <th
                    key={question.id}
                    className="min-w-[208px] max-w-[320px] border-r border-admin-border px-4 py-3 font-normal last:border-r-0"
                  >
                    <span className="flex items-center gap-3 text-[13px] text-admin-text">
                      <QuestionTypeIcon type={question.type} />
                      <span className="line-clamp-2">{question.title === "" ? "..." : question.title}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleResponses.map((response) => (
                <tr
                  key={response.id}
                  tabIndex={0}
                  onClick={() => setOpenResponse(response)}
                  onKeyDown={(event) => event.key === "Enter" && setOpenResponse(response)}
                  className="group cursor-pointer border-b border-admin-border last:border-b-0"
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-admin-border bg-white px-4 py-3 text-[12px] leading-4 text-admin-muted group-hover:bg-[#F7F7F8]">
                    {formatDate(response.submitted_at)}
                    <br />
                    {formatTime(response.submitted_at)}
                  </td>
                  <td className="border-r border-admin-border px-4 py-3 group-hover:bg-[#F7F7F8]">
                    <span className="rounded-full border border-status-green/40 bg-status-green-bg px-2 py-[1px] text-[12px] text-status-green">
                      Completed
                    </span>
                  </td>
                  {questions.map((question) => (
                    <td
                      key={question.id}
                      className="max-w-[320px] border-r border-admin-border px-4 py-3 text-admin-text last:border-r-0 group-hover:bg-[#F7F7F8]"
                    >
                      <AnswerCell answer={findAnswer(response, question.id)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleResponses.length === 0 && (
            <p className="p-8 text-center text-admin-muted">No responses match &quot;{searchText}&quot;.</p>
          )}
        </div>
      )}

      <Modal
        isOpen={openResponse !== null}
        onClose={() => setOpenResponse(null)}
        title="Response"
        description={
          openResponse === null
            ? undefined
            : `Submitted ${formatDate(openResponse.submitted_at)}, ${formatTime(openResponse.submitted_at)}`
        }
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
                <div className="mt-2 whitespace-pre-line pl-[60px] text-admin-text">
                  <AnswerCell answer={findAnswer(openResponse, question.id)} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </div>
  );
}
