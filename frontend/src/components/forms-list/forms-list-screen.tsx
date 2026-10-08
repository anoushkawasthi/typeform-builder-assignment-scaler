"use client";

/**
 * forms-list-screen.tsx — the home page: all of the creator's forms.
 *
 * What it does:   lists forms (as rows or as a grid) with status, response count,
 *                 completion rate and last update; sorts them; finds one through the
 *                 Search dialog; creates,
 *                 renames, duplicates and deletes forms. The layout follows Typeform's
 *                 workspace; parts of it that are outside the brief show "coming soon".
 * Depends on:     form-row.tsx, ui/button.tsx, ui/menu.tsx, ui/modal.tsx, lib/api.ts,
 *                 @tanstack/react-query, sonner.
 * Depended on by: app/page.tsx.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Blocks,
  Calendar,
  ChevronDown,
  Grid2x2,
  LayoutGrid,
  LayoutList,
  List,
  type LucideIcon,
  MoreHorizontal,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Modal, ModalActions } from "@/components/ui/modal";
import * as api from "@/lib/api";
import type { FormListItem } from "@/lib/types";

import { FormCard, FormRow } from "./form-row";

const FORMS_QUERY_KEY = ["forms"];

type SortKey = "date_created" | "last_updated" | "alphabetical";

// Each way of ordering the list: its label and the comparison Array.sort uses.
// ISO date strings sort correctly as plain text, so no date parsing is needed.
const SORT_OPTIONS: Record<SortKey, { label: string; compare: (a: FormListItem, b: FormListItem) => number }> = {
  date_created: { label: "Date created", compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  last_updated: { label: "Last updated", compare: (a, b) => b.updated_at.localeCompare(a.updated_at) },
  alphabetical: { label: "Alphabetical", compare: (a, b) => a.title.localeCompare(b.title) },
};

function showComingSoon(featureName: string) {
  toast(`${featureName} is coming soon`);
}

interface ViewButtonProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

/** One half of the List / Grid switch. */
function ViewButton({ label, icon: Icon, isActive, onClick }: ViewButtonProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={onClick}
      className={
        "flex items-center gap-2 px-3 first:rounded-l-[7px] last:rounded-r-[7px] " +
        (isActive ? "bg-admin-hover text-admin-active" : "text-admin-muted hover:bg-admin-hover")
      }
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}

export function FormsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [formToRename, setFormToRename] = useState<FormListItem | null>(null);
  const [renameText, setRenameText] = useState("");
  const [formToDelete, setFormToDelete] = useState<FormListItem | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("date_created");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const formsQuery = useQuery({ queryKey: FORMS_QUERY_KEY, queryFn: api.listForms });

  /** After any change, ask the server for the list again so the screen is never stale. */
  function refreshList() {
    return queryClient.invalidateQueries({ queryKey: FORMS_QUERY_KEY });
  }

  function showError(error: Error) {
    toast.error(error.message);
  }

  const createMutation = useMutation({
    mutationFn: () => api.createForm("My new form"),
    // A new form opens straight in the builder, as in Typeform.
    onSuccess: (form) => router.push(`/forms/${form.id}/create`),
    onError: showError,
  });

  const renameMutation = useMutation({
    mutationFn: (variables: { formId: number; title: string }) =>
      api.updateForm(variables.formId, { title: variables.title }),
    onSuccess: async (form) => {
      // The builder caches each form separately; drop that copy so it reloads.
      queryClient.removeQueries({ queryKey: ["form", form.id] });
      await refreshList();
      toast.success("Form renamed");
    },
    onError: showError,
  });

  const duplicateMutation = useMutation({
    mutationFn: (formId: number) => api.duplicateForm(formId),
    onSuccess: async (form) => {
      await refreshList();
      toast.success(`Created "${form.title}"`);
    },
    onError: showError,
  });

  const deleteMutation = useMutation({
    mutationFn: (formId: number) => api.deleteForm(formId),
    onSuccess: async () => {
      await refreshList();
      toast.success("Form deleted");
    },
    onError: showError,
  });

  function openSearch() {
    setSearchText("");
    setIsSearchOpen(true);
  }

  /** Pressing Enter in the search box opens the first result. */
  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (searchResults.length > 0) {
      router.push(`/forms/${searchResults[0].id}/create`);
    }
  }

  function openRename(form: FormListItem) {
    setRenameText(form.title);
    setFormToRename(form);
  }

  function submitRename(event: React.FormEvent) {
    event.preventDefault();
    const title = renameText.trim();
    if (formToRename !== null && title !== "" && title !== formToRename.title) {
      renameMutation.mutate({ formId: formToRename.id, title });
    }
    setFormToRename(null);
  }

  function confirmDelete() {
    if (formToDelete !== null) {
      deleteMutation.mutate(formToDelete.id);
    }
    setFormToDelete(null);
  }

  async function copyLink(form: FormListItem) {
    await navigator.clipboard.writeText(`${window.location.origin}/to/${form.public_id}`);
    toast.success("Link copied");
  }

  const allForms = formsQuery.data ?? [];
  // Copy before sorting: Array.sort changes the array it is called on, and this one
  // belongs to the query cache.
  const visibleForms = [...allForms].sort(SORT_OPTIONS[sortBy].compare);

  // Results for the Search dialog: forms whose title contains what was typed.
  const search = searchText.trim().toLowerCase();
  const searchResults = search === "" ? [] : allForms.filter((form) => form.title.toLowerCase().includes(search));

  let totalResponses = 0;
  for (const form of allForms) {
    totalResponses += form.response_count;
  }

  /** Props for one form's row or card; the same for both views. */
  function rowProps(form: FormListItem) {
    return {
      form,
      onRename: () => openRename(form),
      onDuplicate: () => duplicateMutation.mutate(form.id),
      onDelete: () => setFormToDelete(form),
      onCopyLink: () => void copyLink(form),
    };
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar: account on the left, account-wide tools on the right. */}
      <header className="flex h-14 shrink-0 items-center justify-between px-6">
        <button
          type="button"
          onClick={() => showComingSoon("Organizations")}
          className="flex items-center gap-2 rounded-lg py-1 pr-2 text-admin-text hover:bg-admin-hover"
        >
          {/* Our own mark: two rounded bars. Not Typeform's logo. */}
          <span aria-hidden="true" className="flex gap-[3px]">
            <span className="h-6 w-[7px] rounded-[3px] bg-admin-text" />
            <span className="h-6 w-5 rounded-[6px] bg-[#4B7BB5]" />
          </span>
          Typeform Replica
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => showComingSoon("Integrations")}>
            <Blocks aria-hidden="true" className="h-4 w-4" />
            Integrations
          </Button>
          <span
            title="Demo Creator"
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#BDDDF9] text-[12px] font-medium text-admin-text"
          >
            DC
          </span>
        </div>
      </header>

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-admin-panel">
        {/* Typeform has a row of product areas here. Forms is the only one in the brief. */}
        <nav aria-label="Workspace navigation" className="flex h-[58px] shrink-0 items-center gap-1 border-b-2 border-white px-3">
          <span className="relative flex h-8 items-center gap-2 rounded-lg bg-admin-hover px-3 font-medium text-admin-active">
            <LayoutList aria-hidden="true" className="h-4 w-4" />
            Forms
            <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-admin-active" />
          </span>
        </nav>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="flex shrink-0 flex-col border-white md:w-[256px] md:border-r-2">
            <div className="border-b-2 border-white p-4">
              <Button variant="primary" className="w-full" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Create form
              </Button>
            </div>

            <div className="border-b-2 border-white p-4">
              {/* As in Typeform, Search is a button that opens a dialog with results. */}
              <button
                type="button"
                onClick={openSearch}
                className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-admin-muted hover:bg-admin-hover"
              >
                <Search aria-hidden="true" className="h-4 w-4" />
                Search
              </button>
            </div>

            <div className="flex-1 p-4">
              <div className="flex h-8 items-center justify-between pl-3 text-admin-muted">
                <span className="flex items-center gap-2">
                  <LayoutGrid aria-hidden="true" className="h-4 w-4" />
                  Workspaces
                </span>
                <Button iconOnly aria-label="Create workspace" onClick={() => showComingSoon("More workspaces")}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 flex h-8 items-center justify-between px-3 text-admin-muted">
                Private
                <span aria-hidden="true" className="text-[10px]">▲</span>
              </p>
              <div className="mt-2 flex h-10 items-center justify-between rounded-lg bg-admin-hover px-3 text-admin-text">
                My workspace
                <span className="text-[12px] text-admin-muted">{allForms.length}</span>
              </div>
            </div>

            <div className="hidden border-t-2 border-white p-4 md:block">
              <p className="text-admin-text">Responses collected</p>
              <div className="mt-2 h-1 rounded-full bg-admin-border">
                <div className="h-1 w-full rounded-full bg-admin-text" />
              </div>
              <p className="mt-2 text-[16px] text-admin-text">{totalResponses}</p>
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1 p-4 sm:p-10">
            <div className="flex flex-wrap items-center gap-2 border-b border-admin-border pb-6">
              <h1 className="mr-2 text-[24px] leading-8 text-admin-text">My workspace</h1>
              <Button variant="ghost" iconOnly aria-label="Workspace settings" onClick={() => showComingSoon("Workspace settings")}>
                <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => showComingSoon("Team collaboration")}>
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Invite
              </Button>

              <div className="ml-auto flex items-center gap-3">
                <Menu
                  trigger={
                    <Button>
                      <Calendar aria-hidden="true" className="h-4 w-4" />
                      {SORT_OPTIONS[sortBy].label}
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  }
                >
                  {(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => (
                    <MenuItem key={key} onSelect={() => setSortBy(key)}>
                      {SORT_OPTIONS[key].label}
                    </MenuItem>
                  ))}
                </Menu>

                {/* List / Grid switch: two buttons in one outlined box. */}
                <div role="radiogroup" aria-label="View" className="flex h-8 rounded-lg border border-admin-border">
                  <ViewButton label="List" icon={List} isActive={viewMode === "list"} onClick={() => setViewMode("list")} />
                  <ViewButton label="Grid" icon={Grid2x2} isActive={viewMode === "grid"} onClick={() => setViewMode("grid")} />
                </div>
              </div>
            </div>

            {formsQuery.isPending && <p className="mt-8 text-admin-muted">Loading forms...</p>}

            {formsQuery.isError && (
              <p className="mt-8 text-danger">Could not reach the server. Check that the API is running, then reload.</p>
            )}

            {formsQuery.isSuccess && allForms.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DCEBFB] text-admin-text">
                  <LayoutList aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="mt-6 text-[21px] leading-7 text-black">Create a new form to get started</h2>
                <Button variant="primary" className="mt-4" onClick={() => createMutation.mutate()}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Create form
                </Button>
              </div>
            )}

            {formsQuery.isSuccess && allForms.length > 0 && viewMode === "list" && (
              <>
                {/* Column headings. The widths match the cells in form-row.tsx. */}
                <div className="mt-10 flex items-center px-2 pb-3 text-admin-muted">
                  <span className="flex-1" />
                  <span className="w-20 text-center sm:w-28">Responses</span>
                  <span className="hidden w-28 text-center md:block">Completed</span>
                  <span className="hidden w-32 md:block">Updated</span>
                  <span className="hidden w-28 lg:block">Integrations</span>
                  <span className="w-10" />
                </div>
                <ul className="flex flex-col gap-2">
                  {visibleForms.map((form) => (
                    <FormRow key={form.id} {...rowProps(form)} />
                  ))}
                </ul>
              </>
            )}

            {formsQuery.isSuccess && allForms.length > 0 && viewMode === "grid" && (
              <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleForms.map((form) => (
                  <FormCard key={form.id} {...rowProps(form)} />
                ))}
              </ul>
            )}

          </main>
        </div>
      </div>

      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Search">
        <form onSubmit={submitSearch}>
          <input
            autoFocus
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            aria-label="Search forms"
            className="h-[46px] w-full rounded-lg border border-admin-border bg-white px-3 text-[16px] text-admin-text outline-none focus:border-admin-text focus:shadow-[0_0_0_3px_var(--color-admin-ring)]"
          />
        </form>
        <div className="mt-2 max-h-[240px] min-h-[96px] overflow-y-auto">
          {search !== "" && (
            <>
              <p className="px-3 py-2 text-[13px] font-semibold text-admin-text">Forms</p>
              {searchResults.length === 0 && <p className="px-3 py-1 text-admin-muted">No forms found</p>}
              <ul>
                {searchResults.map((form) => (
                  <li key={form.id}>
                    <Link
                      href={`/forms/${form.id}/create`}
                      className="block truncate rounded-lg px-3 py-[6px] text-[13px] font-semibold text-admin-text hover:bg-admin-hover"
                    >
                      {form.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={formToRename !== null} onClose={() => setFormToRename(null)} title="Rename form">
        <form onSubmit={submitRename}>
          <input
            autoFocus
            value={renameText}
            onChange={(event) => setRenameText(event.target.value)}
            maxLength={255}
            aria-label="Form name"
            onFocus={(event) => event.target.select()}
            className="h-[46px] w-full rounded-lg border border-admin-border bg-white px-3 text-[16px] text-admin-text outline-none focus:border-admin-text focus:shadow-[0_0_0_3px_var(--color-admin-ring)]"
          />
          <ModalActions>
            <Button onClick={() => setFormToRename(null)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={renameText.trim() === ""}>
              Save
            </Button>
          </ModalActions>
        </form>
      </Modal>

      <Modal
        isOpen={formToDelete !== null}
        onClose={() => setFormToDelete(null)}
        title="Delete form?"
        description={
          formToDelete === null
            ? undefined
            : `You're about to delete "${formToDelete.title}".\n` +
              (formToDelete.response_count === 0
                ? "This will permanently delete the form."
                : `This will permanently delete the form and its ${formToDelete.response_count} ` +
                  `${formToDelete.response_count === 1 ? "response" : "responses"}.`)
        }
      >
        <ModalActions>
          <Button variant="ghost" onClick={() => setFormToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
