"use client";

/**
 * connect-screen.tsx — the Connect tab: integrations and webhooks.
 *
 * What it does:   looks and browses like Typeform's Connect page (sub-tabs, search,
 *                 categories, a card per app with a Connect button), but nothing is
 *                 actually connected: the brief lists integrations and webhooks as
 *                 placeholders, so each Connect button says "coming soon".
 * Depends on:     use-form-editor.ts, ui/form-header.tsx, ui/button.tsx, sonner.
 * Depended on by: app/forms/[id]/connect/page.tsx.
 *
 * Search and the category list do work: they filter the cards on the page.
 */

import {
  BarChart3,
  BellRing,
  Database,
  type LucideIcon,
  Mail,
  MessageSquare,
  Search,
  Sheet,
  Table2,
  Users,
  Webhook,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";

import { useFormEditor } from "./use-form-editor";

interface Integration {
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  /** Background of the icon tile. Generic icons are used, not the apps' own logos. */
  color: string;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "Google Sheets",
    description: "Send your data straight to Google Sheets. Automatically syncs as results come in.",
    category: "Productivity",
    icon: Sheet,
    color: "#C4E3BA",
  },
  {
    name: "Excel",
    description: "Send new responses to an Excel workbook as they are submitted.",
    category: "Productivity",
    icon: Table2,
    color: "#C4E3BA",
  },
  {
    name: "Slack",
    description: "Get a message in a channel every time someone submits this form.",
    category: "Collaboration",
    icon: MessageSquare,
    color: "#DDD6FA",
  },
  {
    name: "HubSpot",
    description: "Send contact, company or deal info to your CRM to follow up on new leads quickly.",
    category: "Sales",
    icon: Users,
    color: "#F8CDD8",
  },
  {
    name: "Mailchimp",
    description: "Add respondents to an audience and trigger your email campaigns.",
    category: "Marketing automation",
    icon: Mail,
    color: "#FBE19D",
  },
  {
    name: "Google Analytics",
    description: "Discover how people find and interact with your form, and measure your campaigns.",
    category: "Analytics & reporting",
    icon: BarChart3,
    color: "#FBE19D",
  },
  {
    name: "Airtable",
    description: "Create a record in a base for every response.",
    category: "Productivity",
    icon: Database,
    color: "#BDDDF9",
  },
  {
    name: "Zapier",
    description: "Connect this form to thousands of other apps with automated workflows.",
    category: "Automation",
    icon: Workflow,
    color: "#F8CDD8",
  },
  {
    name: "Email notifications",
    description: "Email yourself or your team each time a response comes in.",
    category: "Collaboration",
    icon: BellRing,
    color: "#BDDDF9",
  },
];

const ALL_CATEGORIES = "All";

type ConnectTab = "integrations" | "webhooks";

export function ConnectScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const [activeTab, setActiveTab] = useState<ConnectTab>("integrations");
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  // The category names in the order they first appear, with "All" in front.
  const categories = [ALL_CATEGORIES];
  for (const integration of INTEGRATIONS) {
    if (!categories.includes(integration.category)) {
      categories.push(integration.category);
    }
  }

  function countIn(categoryName: string): number {
    if (categoryName === ALL_CATEGORIES) {
      return INTEGRATIONS.length;
    }
    return INTEGRATIONS.filter((integration) => integration.category === categoryName).length;
  }

  const search = searchText.trim().toLowerCase();
  const visibleIntegrations = INTEGRATIONS.filter(
    (integration) =>
      (category === ALL_CATEGORIES || integration.category === category) &&
      integration.name.toLowerCase().includes(search),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <FormHeader
        formId={formId}
        formTitle={editor.form?.title ?? "..."}
        activeSection="connect"
        hasBeenPublished={(editor.form?.published_at ?? null) !== null}
        onRename={(title) => editor.updateForm({ title })}
      />

      {/* Sub-tabs: small capitals with wide spacing, as on Typeform's Connect page.
          Like the content below, they sit in a column at most 1024px wide in the middle
          of the window, so the page looks the same on a large monitor. */}
      <div className="border-t-[3px] border-admin-panel px-4">
        <div role="tablist" className="mx-auto flex max-w-[1024px] gap-6 px-2">
          <SubTab label="Integrations" isActive={activeTab === "integrations"} onClick={() => setActiveTab("integrations")} />
          <SubTab label="Webhooks" isActive={activeTab === "webhooks"} onClick={() => setActiveTab("webhooks")} />
        </div>
      </div>

      {/* Typeform draws this page in an older style than the rest of the app: near-black
          neutral text (#262627) and squarer corners. */}
      <main className="flex-1 bg-admin-panel px-4 py-12 text-[#262627]">
        {activeTab === "integrations" ? (
          <div className="mx-auto flex max-w-[1024px] flex-col gap-10 lg:flex-row lg:gap-16">
            {/* Left: heading, search, categories. */}
            <div className="shrink-0 lg:w-[256px]">
              <h1 className="text-[24px] font-light leading-8">Connect your form to your favorite apps</h1>
              <p className="mt-2">Create automated, efficient workflows that work for you.</p>

              <label className="mt-6 flex h-10 items-center gap-2 rounded border border-[#BBBBBB] bg-white px-3">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-admin-muted" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search integrations"
                  aria-label="Search integrations"
                  className="w-full bg-transparent text-[16px] leading-6 outline-none placeholder:text-admin-muted"
                />
                {searchText !== "" && (
                  <button type="button" aria-label="Clear search" onClick={() => setSearchText("")}>
                    <X className="h-4 w-4 text-admin-muted" />
                  </button>
                )}
              </label>

              <h2 className="mb-2 mt-6 text-[16px] font-medium leading-6">Categories</h2>
              <ul className="flex flex-col gap-1">
                {categories.map((categoryName) => (
                  <li key={categoryName}>
                    <button
                      type="button"
                      onClick={() => setCategory(categoryName)}
                      aria-pressed={category === categoryName}
                      className={
                        "flex h-8 w-full items-center justify-between px-3 text-left " +
                        (category === categoryName ? "bg-[#E3E3E3]" : "hover:bg-admin-hover")
                      }
                    >
                      {categoryName}
                      <span className="text-[12px]">{countIn(categoryName)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: one card per integration. */}
            <ul className="flex min-w-0 flex-1 flex-col gap-4">
              {visibleIntegrations.map((integration) => (
                <li key={integration.name} className="flex items-center gap-8 rounded-lg bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-admin-text"
                    style={{ backgroundColor: integration.color }}
                  >
                    <integration.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium leading-6">{integration.name}</span>
                    <span className="mt-1 block">{integration.description}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toast(`${integration.name} is coming soon`)}
                    className="h-8 shrink-0 rounded bg-[#262627] px-3 text-white hover:opacity-85"
                  >
                    Connect
                  </button>
                </li>
              ))}
              {visibleIntegrations.length === 0 && (
                <li className="rounded-lg bg-white p-8 text-admin-muted">No integrations match your search.</li>
              )}
            </ul>
          </div>
        ) : (
          <div className="mx-auto max-w-[704px] rounded-lg bg-white p-12 text-center shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDD6FA] text-admin-text">
              <Webhook aria-hidden="true" className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-[24px] leading-8 text-admin-text">Webhooks</h1>
            <p className="mx-auto mt-2 max-w-[440px] text-admin-text">
              Send each new response to a URL of your choice the moment it is submitted.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => toast("Webhooks are coming soon")}>
              Add a webhook
            </Button>
          </div>
        )}
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
        "relative h-12 text-[12px] font-medium uppercase tracking-[1.2px] " +
        (isActive ? "text-[#262627]" : "text-[#898989] hover:text-[#262627]")
      }
    >
      {label}
      {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#262627]" />}
    </button>
  );
}
