"use client";

/**
 * workflow-screen.tsx — the Workflow tab: the form drawn as a flow chart.
 *
 * What it does:   one card per screen (welcome, each question, the ending) joined by
 *                 arrows in the order a respondent meets them. A logic jump is an
 *                 extra arrow labelled with its condition. Cards can be dragged and
 *                 the chart panned and zoomed; clicking a question offers its tools,
 *                 of which Branching opens the Logic dialog. The Actions column on
 *                 the right and the other tools are placeholders for Typeform
 *                 features outside the brief.
 * Depends on:     @xyflow/react (the chart), use-form-editor.ts, logic-dialog.tsx,
 *                 ui/form-header.tsx, ui/question-type-chip.tsx, lib/logic.ts, sonner.
 * Depended on by: app/forms/[id]/workflow/page.tsx.
 *
 * Why a library: panning, zooming, dragging and drawing curved arrows between boxes is
 * a lot of pointer arithmetic. React Flow is the standard React library for exactly
 * this, so this file only has to say which boxes and arrows exist.
 */

import {
  Controls,
  Handle,
  MarkerType,
  NodeToolbar,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowDownRight,
  Blocks,
  Calculator,
  Eye,
  EyeOff,
  GitBranch,
  Mail,
  PanelLeftOpen,
  PanelRightClose,
  Play,
  Plus,
  RefreshCcwDot,
  Settings,
  Sheet,
  Table2,
  Users,
  Variable,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { IconTile, QuestionTypeChip } from "@/components/ui/question-type-chip";
import { stripFormatting } from "@/lib/formatted-text";
import { OPERATOR_LABELS } from "@/lib/logic";
import type { FormDetail, LogicJump, Question } from "@/lib/types";

import { LogicDialog } from "./logic-dialog";
import { useFormEditor } from "./use-form-editor";

// Sizes and spacing of the cards, in the chart's own pixels. Typeform shows its chart
// at 80%, so on screen these come out a fifth smaller.
const CARD_WIDTH = 175;
const CARD_HEIGHT = 121;
const CARD_STEP = 310; // from one card's left edge to the next one's
const START_ZOOM = 0.8;

const ENDING_ID = "ending";
const WELCOME_ID = "welcome";

/** What a step card shows. Passed to the card through React Flow's `data`. */
interface StepData extends Record<string, unknown> {
  kind: "welcome" | "question" | "ending";
  title: string;
  /** Only for questions. */
  question?: Question;
  number?: number;
  onOpenLogic?: () => void;
}

type StepNode = Node<StepData, "step">;

/** The condition half of a rule as words, e.g. `is "Blue"` or `is greater than 3`. */
function describeCondition(question: Question, rule: LogicJump): string {
  if (rule.operator === "always") {
    return "Always";
  }
  let comparedWith = "";
  if (rule.compare_choice_id !== null) {
    const choice = question.choices.find((candidate) => candidate.id === rule.compare_choice_id);
    comparedWith = `"${choice === undefined ? "a removed choice" : stripFormatting(choice.label)}"`;
  } else if (rule.compare_boolean !== null) {
    comparedWith = rule.compare_boolean ? "Yes" : "No";
  } else if (rule.compare_number !== null) {
    comparedWith = String(rule.compare_number);
  }
  return `If the answer ${OPERATOR_LABELS[rule.operator]} ${comparedWith}`;
}

/** A step card: the welcome screen, a question, or the ending. */
function StepCard({ data, selected }: NodeProps<StepNode>) {
  const question = data.question;
  const hasRules = question !== undefined && question.logic_jumps.length > 0;

  return (
    <div
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className={
        "rounded-xl bg-white p-4 text-[13px] leading-[17px] text-admin-text " +
        (selected ? "shadow-[0_0_0_2px_var(--color-admin-border)]" : "")
      }
    >
      {/* The points arrows attach to. Invisible: the arrows should seem to touch the card. */}
      <Handle type="target" position={Position.Left} className="!border-0 !bg-transparent" />
      <Handle type="source" position={Position.Right} className="!border-0 !bg-transparent" />

      {question !== undefined && data.number !== undefined ? (
        <QuestionTypeChip type={question.type} number={data.number} />
      ) : (
        <span className="flex h-6 w-12">
          <IconTile color="#DEDCDE" icon={data.kind === "welcome" ? PanelLeftOpen : PanelRightClose} />
        </span>
      )}
      <p className="mt-3 line-clamp-2">{data.title === "" ? "..." : stripFormatting(data.title)}</p>
      {/* Typeform lists the first choice and then "..." for the rest. */}
      {question !== undefined && question.choices.length > 0 && (
        <p className="truncate">- {stripFormatting(question.choices[0].label)}</p>
      )}
      {question !== undefined && question.choices.length > 1 && <p>- ...</p>}

      {/* A question with rules carries a round branching badge on its right edge. */}
      {hasRules && (
        <button
          type="button"
          aria-label="Edit branching"
          title="Edit branching"
          onClick={data.onOpenLogic}
          className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-admin-text text-white"
        >
          <GitBranch aria-hidden="true" className="h-3 w-3" />
        </button>
      )}

      {/* Shown under the card while it is selected. Only questions have tools. */}
      {question !== undefined && (
        <NodeToolbar position={Position.Bottom} offset={8} className="flex rounded-xl border border-admin-border bg-white p-1">
          <Button variant="ghost" iconOnly aria-label="Question display" title="Question display" onClick={() => toast("Question display is coming soon")}>
            <Eye aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Hide question" title="Hide question" onClick={() => toast("Hiding questions is coming soon")}>
            <EyeOff aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Branching" title="Branching" onClick={data.onOpenLogic}>
            <GitBranch aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button variant="ghost" iconOnly aria-label="Calculations" title="Calculations" onClick={() => toast("Calculations are coming soon")}>
            <Calculator aria-hidden="true" className="h-4 w-4" />
          </Button>
        </NodeToolbar>
      )}
    </div>
  );
}

/** The dashed "Pull data in" card that Typeform keeps at the start of the chart. */
function PullDataCard() {
  return (
    <div className="w-[279px] rounded-xl border border-dashed border-admin-border p-5 text-admin-text">
      <ArrowDownRight aria-hidden="true" className="h-6 w-6" />
      <p className="mt-4 text-[16px] leading-6">Pull data in</p>
      <p className="mt-2 text-[14px] leading-[22px] text-admin-muted">
        Track sources, identify respondents, and personalize the form content and flow with URL parameters.
      </p>
      <Button iconOnly className="nodrag mt-4" aria-label="Add URL parameters" title="Add URL parameters" onClick={() => toast("URL parameters are coming soon")}>
        <Plus aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Must be defined once, outside any component: React Flow re-creates every card if it
// is handed a new object here on each render.
const NODE_TYPES = { step: StepCard, pullData: PullDataCard };

const ARROW = { type: MarkerType.Arrow, color: "#655D67", width: 18, height: 18 };

/** Every card of the chart, left to right in form order. */
function buildNodes(form: FormDetail, openLogic: (questionId: number) => void): Node[] {
  const nodes: Node[] = [
    // 355px left of the first card and a little higher, as on Typeform. It is part of
    // the chart (it pans and zooms with it) but cannot be moved or selected.
    { id: "pull-data", type: "pullData", position: { x: -355, y: -48 }, data: {}, draggable: false, selectable: false },
  ];
  let column = 0;

  if (form.welcome_enabled) {
    const data: StepData = { kind: "welcome", title: form.welcome_title };
    nodes.push({ id: WELCOME_ID, type: "step", position: { x: column * CARD_STEP, y: 0 }, data });
    column += 1;
  }

  form.questions.forEach((question, index) => {
    const data: StepData = {
      kind: "question",
      title: question.title,
      question,
      number: index + 1,
      onOpenLogic: () => openLogic(question.id),
    };
    nodes.push({ id: String(question.id), type: "step", position: { x: column * CARD_STEP, y: 0 }, data });
    column += 1;
  });

  const ending: StepData = { kind: "ending", title: form.thank_you_title };
  nodes.push({ id: ENDING_ID, type: "step", position: { x: column * CARD_STEP, y: 0 }, data: ending });
  return nodes;
}

/**
 * Every arrow of the chart: one from each screen to the next, plus one per logic jump
 * from its question to wherever the rule sends the respondent.
 */
function buildEdges(form: FormDetail): Edge[] {
  const edges: Edge[] = [];
  const questions = form.questions;
  const lineStyle = { stroke: "#655D67", strokeWidth: 1 };

  if (form.welcome_enabled && questions.length > 0) {
    edges.push({ id: "welcome-next", source: WELCOME_ID, target: String(questions[0].id), markerEnd: ARROW, style: lineStyle });
  }

  questions.forEach((question, index) => {
    const nextId = index === questions.length - 1 ? ENDING_ID : String(questions[index + 1].id);
    edges.push({ id: `${question.id}-next`, source: String(question.id), target: nextId, markerEnd: ARROW, style: lineStyle });

    for (const rule of question.logic_jumps) {
      const targetId = rule.target_question_id === null ? ENDING_ID : String(rule.target_question_id);
      // A rule that only says "go to the next question" is already drawn above.
      if (targetId === nextId) {
        continue;
      }
      edges.push({
        id: `rule-${rule.id}`,
        source: String(question.id),
        target: targetId,
        label: describeCondition(question, rule),
        markerEnd: ARROW,
        // Dashed, so a jump can be told apart from the normal order.
        style: { ...lineStyle, strokeDasharray: "4 4" },
        labelStyle: { fontSize: 12, fill: "#3C323E" },
        labelBgStyle: { fill: "#F7F7F8" },
      });
    }
  });

  return edges;
}

export function WorkflowScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const form = editor.form;
  // The question whose Logic dialog is open, or null when it is closed.
  const [logicQuestionId, setLogicQuestionId] = useState<number | null>(null);

  const questions = form?.questions ?? [];

  function openLogicForFirstQuestion() {
    if (questions.length === 0) {
      toast("Add a question first");
    } else {
      setLogicQuestionId(questions[0].id);
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <FormHeader
        formId={formId}
        formTitle={form?.title ?? "..."}
        activeSection="workflow"
        hasBeenPublished={(form?.published_at ?? null) !== null}
        onRename={(title) => editor.updateForm({ title })}
      />

      {/* One grey panel split by 2px white lines into the chart and the Actions column. */}
      <div className="mx-4 mb-4 flex min-h-0 flex-1 gap-[2px] overflow-hidden rounded-xl">
        <main className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <div className="flex h-12 shrink-0 items-center gap-1 bg-admin-panel px-2">
            <Button variant="ghost" onClick={openLogicForFirstQuestion}>
              Logic
            </Button>
            <Button variant="ghost" onClick={() => toast("Scoring is coming soon")}>
              Scoring
            </Button>
            <Button variant="ghost" onClick={() => toast("Tagging is coming soon")}>
              Tagging
            </Button>
            <Button variant="ghost" onClick={() => toast("Outcome quizzes are coming soon")}>
              Outcome quiz
            </Button>
            <span className="mx-1 h-4 w-px bg-admin-border" />
            <Link
              href={`/forms/${formId}/preview`}
              aria-label="Preview"
              title="Preview"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
            >
              <Play aria-hidden="true" className="h-4 w-4" />
            </Link>
            <span className="mx-1 h-4 w-px bg-admin-border" />
            <Button variant="ghost" iconOnly aria-label="Variables" title="Variables" onClick={() => toast("Variables are coming soon")}>
              <Variable aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button variant="ghost" iconOnly aria-label="Version history" title="Version history" onClick={() => toast("Version history is coming soon")}>
              <RefreshCcwDot aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button variant="ghost" iconOnly aria-label="Workflow settings" title="Workflow settings" onClick={() => toast("Workflow settings are coming soon")}>
              <Settings aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 bg-admin-panel">
            {form !== undefined && (
              <ReactFlow
                // The chart keeps its own copy of the cards so they can be dragged. A new
                // key throws that copy away and redraws when the form itself changes.
                key={JSON.stringify([form.welcome_enabled, form.welcome_title, form.thank_you_title, form.questions])}
                defaultNodes={buildNodes(form, setLogicQuestionId)}
                defaultEdges={buildEdges(form)}
                nodeTypes={NODE_TYPES}
                // Start where Typeform does: at 80%, the first card 374px in, a third down.
                defaultViewport={{ x: 374, y: 270, zoom: START_ZOOM }}
                minZoom={0.3}
                maxZoom={1.5}
                // The chart shows the form; it is not where arrows are drawn by hand.
                nodesConnectable={false}
                edgesFocusable={false}
              >
                <Controls position="bottom-right" orientation="horizontal" showInteractive={false} />
              </ReactFlow>
            )}
          </div>
        </main>

        <aside className="flex w-[256px] shrink-0 flex-col gap-[2px]">
          <h2 className="flex h-12 shrink-0 items-center bg-admin-panel px-4 font-medium text-admin-text">Actions</h2>
          <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto bg-admin-panel p-4">
            <ActionCard icon={Blocks} title="Connect">
              <Link href={`/forms/${formId}/connect`} title="Connect an app" className="flex gap-2">
                <ActionTile icon={Sheet} />
                <ActionTile icon={Table2} />
                <ActionTile icon={Zap} />
                <ActionTile icon={Plus} />
              </Link>
            </ActionCard>
            <ActionCard icon={Workflow} title="Automations" badge="New" text="Activate automations based on submissions to this form.">
              <button type="button" onClick={() => toast("Automations are coming soon")} className="flex gap-2">
                <ActionTile icon={Mail} />
                <ActionTile icon={Webhook} />
                <ActionTile icon={Plus} />
              </button>
            </ActionCard>
            <ActionCard icon={Users} title="Contacts" text="Map form responses to create or update your contacts.">
              <button type="button" onClick={() => toast("Contacts are coming soon")} className="flex gap-2">
                <ActionTile icon={Settings} />
              </button>
            </ActionCard>
          </div>
        </aside>
      </div>

      {logicQuestionId !== null && form !== undefined && (
        <LogicDialog
          questions={questions}
          initialQuestionId={logicQuestionId}
          editor={editor}
          onClose={() => setLogicQuestionId(null)}
        />
      )}
    </div>
  );
}

interface ActionCardProps {
  icon: typeof Blocks;
  title: string;
  badge?: string;
  text?: string;
  children: React.ReactNode;
}

/** One dashed card of the Actions column. */
function ActionCard({ icon: Icon, title, badge, text, children }: ActionCardProps) {
  return (
    <section className="rounded-xl border border-dashed border-admin-border p-4">
      <Icon aria-hidden="true" className="h-6 w-6 text-admin-text" />
      <h3 className="mt-3 flex items-center gap-2 text-admin-text">
        {title}
        {badge !== undefined && (
          <span className="rounded-full border border-[#B4D5F5] px-2 text-[12px] leading-[18px] text-[#1B5FA8]">{badge}</span>
        )}
      </h3>
      {text !== undefined && <p className="text-[13px] leading-[17px] text-admin-muted">{text}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A small square icon button face used inside the Actions cards. */
function ActionTile({ icon: Icon }: { icon: typeof Blocks }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-admin-border bg-white/80 text-admin-muted">
      <Icon aria-hidden="true" className="h-4 w-4" />
    </span>
  );
}
