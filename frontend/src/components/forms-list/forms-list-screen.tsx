"use client";

/**
 * forms-list-screen.tsx — the home page: all of the creator's forms.
 *
 * What it does:   lists forms with their status, response count and last update;
 *                 creates, renames, duplicates and deletes forms; searches by name.
 * Depends on:     form-row.tsx, ui/button.tsx, ui/modal.tsx, lib/api.ts,
 *                 @tanstack/react-query, sonner.
 * Depended on by: app/page.tsx.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutList, Plus, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";
import * as api from "@/lib/api";
import type { FormListItem } from "@/lib/types";

import { FormRow } from "./form-row";

const FORMS_QUERY_KEY = ["forms"];

export function FormsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [formToRename, setFormToRename] = useState<FormListItem | null>(null);
  const [renameText, setRenameText] = useState("");
  const [formToDelete, setFormToDelete] = useState<FormListItem | null>(null);

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
  const visibleForms = allForms.filter((form) => form.title.toLowerCase().includes(searchText.trim().toLowerCase()));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between px-6">
        <span className="flex items-center gap-2 text-[16px] font-medium text-admin-text">
          {/* Our own mark: two rounded bars. Not Typeform's logo. */}
          <span aria-hidden="true" className="flex gap-[3px]">
            <span className="h-5 w-[6px] rounded-[3px] bg-admin-text" />
            <span className="h-5 w-4 rounded-[5px] bg-admin-text" />
          </span>
          Typeform Replica
        </span>
        <span
          title="Demo Creator"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BDDDF9] text-[12px] font-medium text-admin-text"
        >
          DC
        </span>
      </header>

      <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-admin-panel md:flex-row">
        {/* Sidebar */}
        <aside className="flex shrink-0 flex-col gap-4 border-white p-4 md:w-[256px] md:border-r-2">
          <Button variant="primary" className="w-full" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create form
          </Button>

          <label className="flex h-8 items-center gap-2 rounded-lg px-3 text-admin-muted focus-within:bg-admin-hover">
            <Search aria-hidden="true" className="h-4 w-4" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search"
              aria-label="Search forms"
              className="w-full bg-transparent text-admin-text outline-none placeholder:text-admin-muted"
            />
          </label>

          <div>
            <p className="mb-2 px-3 text-admin-muted">Workspaces</p>
            <div className="flex h-10 items-center justify-between rounded-lg bg-admin-hover px-3 text-admin-text">
              My workspace
              <span className="text-[12px] text-admin-muted">{allForms.length}</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 sm:p-10">
          <div className="flex items-center gap-4 border-b border-admin-border pb-6">
            <h1 className="text-[24px] leading-8 text-admin-text">My workspace</h1>
            <Button
              variant="ghost"
              onClick={() => toast("Team collaboration is coming soon")}
              title="Invite teammates (coming soon)"
            >
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              Invite
            </Button>
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

          {formsQuery.isSuccess && allForms.length > 0 && (
            <>
              {/* Column headings. The widths match the cells in form-row.tsx. */}
              <div className="mt-8 hidden items-center px-2 pb-3 text-admin-muted md:flex">
                <span className="flex-1" />
                <span className="w-28">Status</span>
                <span className="w-24 text-right">Questions</span>
                <span className="w-24 text-right">Responses</span>
                <span className="w-32 text-right">Updated</span>
                <span className="w-12" />
              </div>
              <ul className="mt-4 flex flex-col gap-2 md:mt-0">
                {visibleForms.map((form) => (
                  <FormRow
                    key={form.id}
                    form={form}
                    onRename={() => openRename(form)}
                    onDuplicate={() => duplicateMutation.mutate(form.id)}
                    onDelete={() => setFormToDelete(form)}
                    onCopyLink={() => void copyLink(form)}
                  />
                ))}
              </ul>
              {visibleForms.length === 0 && (
                <p className="mt-8 text-center text-admin-muted">No forms match &quot;{searchText}&quot;.</p>
              )}
            </>
          )}
        </main>
      </div>

      <Modal isOpen={formToRename !== null} onClose={() => setFormToRename(null)} title="Rename this form">
        <form onSubmit={submitRename}>
          <input
            autoFocus
            value={renameText}
            onChange={(event) => setRenameText(event.target.value)}
            maxLength={255}
            aria-label="Form name"
            className="h-10 w-full rounded-lg border border-admin-border bg-white px-3 text-admin-text outline-none focus:border-admin-text"
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
        title="Delete this form?"
        description={
          formToDelete === null
            ? undefined
            : `"${formToDelete.title}" and its ${formToDelete.response_count} ` +
              `${formToDelete.response_count === 1 ? "response" : "responses"} will be permanently deleted. ` +
              `This can't be undone.`
        }
      >
        <ModalActions>
          <Button onClick={() => setFormToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete form
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}
