"use client";

/**
 * responses-tab.tsx — the "Responses" tab of the results page.
 *
 * What it does:   a toolbar (search, export, row height) over a table with one row per
 *                 submission and one column per question. Rows can be ticked to export
 *                 only those, sorted by time, and clicked to see the response in full.
 * Depends on:     export-dialog.tsx, ui/modal.tsx, ui/menu.tsx, ui/button.tsx,
 *                 ui/segmented-control.tsx, ui/question-type-chip.tsx, lib/types.ts,
 *                 sonner.
 * Depended on by: results-screen.tsx.
 *
 * The server sends the responses newest first with every answer already formatted as
 * text (`display`), so this file has no per-question-type logic. Searching, sorting and
 * ticking all happen here in the browser, on the list that is already loaded.
 */

import {
  Check,
  ChevronDown,
  Clock,
  Calendar,
  Download,
  Filter,
  FoldVertical,
  Inbox,
  ListFilter,
  OctagonAlert,
  PanelRightClose,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { IconTile, QuestionTypeChip, QuestionTypeIcon } from "@/components/ui/question-type-chip";
import { SegmentedControl, type Segment } from "@/components/ui/segmented-control";
import { stripFormatting } from "@/lib/formatted-text";
import type { AnswerOut, ResponseOut, ResponsesTable } from "@/lib/types";

import { ExportDialog } from "./export-dialog";

interface ResponsesTabProps {
  formId: number;
  table: ResponsesTable;
}

type Mailbox = "responses" | "spam";

// Grey used behind the icons of the columns that are not questions.
const PLAIN_TILE_COLOR = "#DEDCDE";

// Every cell: a line under it and a line to its right, as in a spreadsheet.
const CELL_BORDERS = "border-b border-r border-admin-border";

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

/** A small outlined tag, used for picked choices and for the ending. */
function Tag({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="inline-block max-w-full truncate rounded-[6px] border border-admin-muted/50 px-2 align-middle text-[12px] leading-[22px] text-admin-text"
    >
      {text}
    </span>
  );
}

/** One table cell: choices as tags, other answers as text, "–" if none. */
function AnswerCell({ answer }: { answer: AnswerOut | undefined }) {
  if (answer === undefined || answer.display === "") {
    return <span className="text-admin-muted">–</span>;
  }
  if (answer.choice_labels.length > 0) {
    return (
      <span className="flex flex-wrap gap-1">
        {answer.choice_labels.map((label) => (
          <Tag key={label} text={label} />
        ))}
      </span>
    );
  }
  return <span className="line-clamp-2">{answer.display}</span>;
}

export function ResponsesTab({ formId, table }: ResponsesTabProps) {
  const [openResponse, setOpenResponse] = useState<ResponseOut | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isNewestFirst, setIsNewestFirst] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { questions, responses } = table;
  const search = searchText.trim().toLowerCase();

  const matchingResponses = responses.filter((response) => responseMatches(response, search));
  // The server's order is newest first; the other order is the same list backwards.
  const visibleResponses = isNewestFirst ? matchingResponses : [...matchingResponses].reverse();

  const isEveryVisibleSelected =
    visibleResponses.length > 0 && visibleResponses.every((response) => selectedIds.includes(response.id));

  function toggleSelected(responseId: number) {
    if (selectedIds.includes(responseId)) {
      setSelectedIds(selectedIds.filter((id) => id !== responseId));
    } else {
      setSelectedIds([...selectedIds, responseId]);
    }
  }

  function toggleAllVisible() {
    if (isEveryVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleResponses.map((response) => response.id));
    }
  }

  function changeMailbox(mailbox: Mailbox) {
    // We do no spam detection, so there is never anything in a spam list to show.
    if (mailbox === "spam") {
      toast("Spam filtering is coming soon");
    }
  }

  const mailboxSegments: Segment<Mailbox>[] = [
    { value: "responses", title: "Responses", label: "Responses", icon: Inbox },
    { value: "spam", title: "Spam (coming soon)", label: "Spam [0]", icon: OctagonAlert },
  ];

  const cellPadding = isCompact ? "py-[5px]" : "py-[13px]";
  // Ticked rows are what gets exported; with nothing ticked, everything is.
  const exportCount = selectedIds.length > 0 ? selectedIds.length : responses.length;

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl ariaLabel="Mailbox" segments={mailboxSegments} value="responses" onChange={changeMailbox} />
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
        {/* Filtering by date or by answer is outside the brief; the buttons mark the spot. */}
        <Button onClick={() => toast("Date ranges are coming soon")}>
          <Calendar aria-hidden="true" className="h-4 w-4" />
          All time
        </Button>
        <Button onClick={() => toast("Filters are coming soon")}>
          <ListFilter aria-hidden="true" className="h-4 w-4" />
          Filters
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            iconOnly
            aria-label="Compact rows"
            aria-pressed={isCompact}
            title={isCompact ? "Roomy rows" : "Compact rows"}
            onClick={() => setIsCompact(!isCompact)}
            className={isCompact ? "bg-admin-hover" : ""}
          >
            <FoldVertical aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Choose columns"
            title="Choose columns"
            onClick={() => toast("Choosing columns is coming soon")}
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Export responses"
            title="Export responses"
            disabled={responses.length === 0}
            onClick={() => setIsExportOpen(true)}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button onClick={() => toast("Test responses are coming soon")}>Generate test response</Button>
        </div>
      </div>

      {/* The table sits in a white card that fills the rest of the page, as in Typeform. */}
      <div className="flex-1 overflow-x-auto rounded-xl bg-white px-[14px]">
        {responses.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="text-[24px] leading-8 text-admin-text">Waiting for responses</h2>
            <p className="mt-2 text-[16px] text-admin-muted">Submissions will be listed here as they arrive.</p>
          </div>
        ) : (
          // table-fixed: every column keeps the width given in the heading row, and the
          // empty last column takes whatever is left, so a form with few questions does
          // not stretch its columns across the screen.
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr>
                <th className={`sticky left-0 z-10 w-[206px] bg-white py-[11px] pr-3 font-normal ${CELL_BORDERS}`}>
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label="Select all responses"
                      checked={isEveryVisibleSelected}
                      onChange={toggleAllVisible}
                      className="ml-[10px] h-5 w-5 shrink-0 accent-admin-text"
                    />
                    <Menu
                      align="start"
                      trigger={
                        <button
                          type="button"
                          title="Sort by response time"
                          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-admin-border px-1 text-[13px] text-admin-text hover:bg-admin-hover"
                        >
                          <IconTile color={PLAIN_TILE_COLOR} icon={Clock} />
                          <span className="min-w-0 flex-1 truncate text-left">Response time</span>
                          <ChevronDown aria-hidden="true" className="mr-1 h-4 w-4 shrink-0 text-admin-muted" />
                        </button>
                      }
                    >
                      <MenuItem onSelect={() => setIsNewestFirst(true)}>
                        <Check aria-hidden="true" className={"h-4 w-4 " + (isNewestFirst ? "" : "invisible")} />
                        Newest first
                      </MenuItem>
                      <MenuItem onSelect={() => setIsNewestFirst(false)}>
                        <Check aria-hidden="true" className={"h-4 w-4 " + (isNewestFirst ? "invisible" : "")} />
                        Oldest first
                      </MenuItem>
                    </Menu>
                  </span>
                </th>
                <th className={`w-[162px] px-4 py-[11px] font-normal ${CELL_BORDERS}`}>
                  <span className="flex items-center gap-3 text-[13px] text-admin-text">
                    <IconTile color={PLAIN_TILE_COLOR} icon={Filter} />
                    Response type
                  </span>
                </th>
                {questions.map((question) => (
                  <th key={question.id} className={`w-[256px] px-3 py-[11px] font-normal ${CELL_BORDERS}`}>
                    <span className="flex items-center gap-3 text-[13px] text-admin-text">
                      <QuestionTypeIcon type={question.type} />
                      <span className="line-clamp-2">{question.title === "" ? "..." : stripFormatting(question.title)}</span>
                    </span>
                  </th>
                ))}
                <th className={`w-[208px] px-3 py-[11px] font-normal ${CELL_BORDERS}`}>
                  <span className="flex items-center gap-3 text-[13px] text-admin-text">
                    <IconTile color={PLAIN_TILE_COLOR} icon={PanelRightClose} />
                    Ending
                  </span>
                </th>
                {/* The filler: no width of its own, no line to its right. */}
                <th aria-hidden="true" className="border-b border-admin-border" />
              </tr>
            </thead>
            <tbody>
              {visibleResponses.map((response) => (
                <tr
                  key={response.id}
                  tabIndex={0}
                  onClick={() => setOpenResponse(response)}
                  onKeyDown={(event) => event.key === "Enter" && setOpenResponse(response)}
                  className="group cursor-pointer"
                >
                  <td className={`sticky left-0 z-10 bg-white pr-3 group-hover:bg-[#F7F7F8] ${cellPadding} ${CELL_BORDERS}`}>
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        aria-label="Select this response"
                        checked={selectedIds.includes(response.id)}
                        onChange={() => toggleSelected(response.id)}
                        // Ticking a row must not also open it.
                        onClick={(event) => event.stopPropagation()}
                        className="ml-[10px] h-5 w-5 shrink-0 accent-admin-text"
                      />
                      <span className="whitespace-nowrap pl-2 text-[12px] leading-4 text-admin-muted">
                        {formatDate(response.submitted_at)}
                        <br />
                        {formatTime(response.submitted_at)}
                      </span>
                    </span>
                  </td>
                  <td className={`px-4 group-hover:bg-[#F7F7F8] ${cellPadding} ${CELL_BORDERS}`}>
                    <span className="rounded-[6px] border border-status-green/40 bg-status-green-bg px-2 py-[2px] text-[12px] text-status-green">
                      Completed
                    </span>
                  </td>
                  {questions.map((question) => (
                    <td
                      key={question.id}
                      className={`px-3 text-admin-text group-hover:bg-[#F7F7F8] ${cellPadding} ${CELL_BORDERS}`}
                    >
                      <AnswerCell answer={findAnswer(response, question.id)} />
                    </td>
                  ))}
                  <td className={`px-3 group-hover:bg-[#F7F7F8] ${cellPadding} ${CELL_BORDERS}`}>
                    {/* A form has one ending, which Typeform letters "A". */}
                    <Tag text={`A. ${table.ending_title}`} />
                  </td>
                  <td aria-hidden="true" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {responses.length > 0 && visibleResponses.length === 0 && (
          <p className="p-8 text-center text-admin-muted">No responses match &quot;{searchText}&quot;.</p>
        )}
      </div>

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        formId={formId}
        responseIds={selectedIds}
        responseCount={exportCount}
      />

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
        tone="panel"
      >
        {openResponse !== null && (
          <ol className="flex flex-col gap-3">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-xl bg-white p-4">
                <div className="flex items-start gap-3">
                  <QuestionTypeChip type={question.type} number={index + 1} />
                  <p className="font-medium text-admin-text">{question.title === "" ? "..." : stripFormatting(question.title)}</p>
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
