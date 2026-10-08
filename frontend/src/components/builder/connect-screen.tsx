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

      {/* Sub-tabs: small capitals with wide spacing, as on Typeform's Connect page. */}
      <div role="tablist" className="flex gap-6 border-t border-admin-border px-4 md:px-[208px]">
        <SubTab label="Integrations" isActive={activeTab === "integrations"} onClick={() => setActiveTab("integrations")} />
        <SubTab label="Webhooks" isActive={activeTab === "webhooks"} onClick={() => setActiveTab("webhooks")} />
      </div>

      <main className="flex-1 bg-admin-panel px-4 py-12 md:px-[200px]">
        {activeTab === "integrations" ? (
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            {/* Left: heading, search, categories. */}
            <div className="shrink-0 lg:w-[256px]">
              <h1 className="text-[24px] leading-8 text-admin-text">Connect your form to your favorite apps</h1>
              <p className="mt-2 text-admin-text">Create automated, efficient workflows that work for you.</p>

              <label className="mt-6 flex h-10 items-center gap-2 border border-admin-muted/60 bg-white px-3">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-admin-muted" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search integrations"
                  aria-label="Search integrations"
                  className="w-full bg-transparent text-[16px] text-admin-text outline-none placeholder:text-admin-muted"
                />
                {searchText !== "" && (
                  <button type="button" aria-label="Clear search" onClick={() => setSearchText("")}>
                    <X className="h-4 w-4 text-admin-muted" />
                  </button>
                )}
              </label>

              <h2 className="mb-3 mt-7 text-[16px] text-admin-text">Categories</h2>
              <ul>
                {categories.map((categoryName) => (
                  <li key={categoryName}>
                    <button
                      type="button"
                      onClick={() => setCategory(categoryName)}
                      aria-pressed={category === categoryName}
                      className={
                        "flex h-9 w-full items-center justify-between px-3 text-left text-admin-text " +
                        (category === categoryName ? "bg-[#E3E3E3]" : "hover:bg-admin-hover")
                      }
                    >
                      {categoryName}
                      <span className="text-[12px] text-admin-muted">{countIn(categoryName)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: one card per integration. */}
            <ul className="flex min-w-0 flex-1 flex-col gap-4">
              {visibleIntegrations.map((integration) => (
                <li key={integration.name} className="flex items-center gap-8 rounded-lg bg-white p-8 shadow-[0_1px_3px_rgba(60,50,62,0.08)]">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-admin-text"
                    style={{ backgroundColor: integration.color }}
                  >
                    <integration.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] text-admin-text">{integration.name}</span>
                    <span className="mt-1 block text-admin-text">{integration.description}</span>
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
          <div className="mx-auto max-w-[704px] rounded-lg bg-white p-12 text-center shadow-[0_1px_3px_rgba(60,50,62,0.08)]">
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
        "relative h-[50px] text-[12px] uppercase tracking-[0.1em] " +
        (isActive ? "text-admin-text" : "text-admin-muted hover:text-admin-text")
      }
    >
      {label}
      {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-admin-text" />}
    </button>
  );
}
