"use client";

/**
 * use-form-editor.ts — loading one form and saving every kind of edit to it.
 *
 * What it does:   a React hook that fetches a form and returns one function per edit
 *                 (add question, update question, reorder, publish...). After each
 *                 save, the form held in memory is replaced by the server's reply.
 * Depends on:     lib/api.ts, @tanstack/react-query, sonner (error toasts).
 * Depended on by: builder-screen.tsx, form-header.tsx users, preview and results
 *                 screens (for the form's title and status).
 *
 * Why every edit replaces the whole form: each API route returns the complete updated
 * form, so the screen always shows exactly what the database holds. There is no second
 * copy of the form's state to keep in step.
 */

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as api from "@/lib/api";
import type { FormDetail, FormUpdate, QuestionType, QuestionUpdate } from "@/lib/types";

/** The cache key under which a form is stored. Shared by every screen that shows it. */
export function formQueryKey(formId: number) {
  return ["form", formId];
}

// Every save uses this key so we can count how many saves are in flight ("Saving...").
const SAVE_MUTATION_KEY = ["form-save"];

export function useFormEditor(formId: number) {
  const queryClient = useQueryClient();

  const formQuery = useQuery({
    queryKey: formQueryKey(formId),
    queryFn: () => api.getForm(formId),
  });

  /** Put a form returned by the server into the cache, replacing the old one. */
  function storeForm(form: FormDetail) {
    queryClient.setQueryData(formQueryKey(formId), form);
    // The form list shows titles, statuses and counts, so it is now out of date.
    void queryClient.invalidateQueries({ queryKey: ["forms"] });
  }

  // Every save behaves the same way: on success store the returned form, on failure
  // show the server's message in a toast. Each mutation below spreads these in.
  const saveOptions = {
    mutationKey: SAVE_MUTATION_KEY,
    // Mutations that share a scope run one at a time, in the order they were started.
    // Without this, two quick edits could reach the server (and come back) in either
    // order, and the older reply could overwrite the newer one on screen.
    scope: { id: `form-save-${formId}` },
    onSuccess: storeForm,
    onError: (error: Error) => {
      toast.error(error.message);
    },
  };

  const updateFormMutation = useMutation({
    ...saveOptions,
    mutationFn: (changes: FormUpdate) => api.updateForm(formId, changes),
  });
  const addQuestionMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { type: QuestionType; position?: number }) =>
      api.createQuestion(formId, variables.type, variables.position),
  });
  const updateQuestionMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { questionId: number; changes: QuestionUpdate }) =>
      api.updateQuestion(variables.questionId, variables.changes),
  });
  const deleteQuestionMutation = useMutation({
    ...saveOptions,
    mutationFn: (questionId: number) => api.deleteQuestion(questionId),
  });
  const addChoiceMutation = useMutation({
    ...saveOptions,
    mutationFn: (questionId: number) => api.createChoice(questionId, ""),
  });
  const renameChoiceMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { choiceId: number; label: string }) =>
      api.updateChoice(variables.choiceId, variables.label),
  });
  const deleteChoiceMutation = useMutation({
    ...saveOptions,
    mutationFn: (choiceId: number) => api.deleteChoice(choiceId),
  });
  const reorderMutation = useMutation({
    ...saveOptions,
    mutationFn: (questionIds: number[]) => api.reorderQuestions(formId, questionIds),
  });
  const publishMutation = useMutation({
    ...saveOptions,
    mutationFn: () => api.publishForm(formId),
  });
  const unpublishMutation = useMutation({
    ...saveOptions,
    mutationFn: () => api.unpublishForm(formId),
  });

  /**
   * Reordering is the one edit shown before the server confirms it: the list is
   * rearranged in the cache immediately, so the dragged card does not snap back for a
   * moment while the request is in flight.
   */
  function reorderQuestions(questionIds: number[]) {
    const current = queryClient.getQueryData<FormDetail>(formQueryKey(formId));
    if (current !== undefined) {
      const reordered = questionIds
        .map((questionId) => current.questions.find((question) => question.id === questionId))
        .filter((question) => question !== undefined);
      queryClient.setQueryData(formQueryKey(formId), { ...current, questions: reordered });
    }
    reorderMutation.mutate(questionIds);
  }

  const savesInFlight = useIsMutating({ mutationKey: SAVE_MUTATION_KEY });

  return {
    form: formQuery.data,
    isLoading: formQuery.isPending,
    loadError: formQuery.error,
    isSaving: savesInFlight > 0,

    updateForm: (changes: FormUpdate) => updateFormMutation.mutate(changes),
    addQuestion: (type: QuestionType, position?: number) => addQuestionMutation.mutateAsync({ type, position }),
    updateQuestion: (questionId: number, changes: QuestionUpdate) =>
      updateQuestionMutation.mutate({ questionId, changes }),
    deleteQuestion: (questionId: number) => deleteQuestionMutation.mutateAsync(questionId),
    addChoice: (questionId: number) => addChoiceMutation.mutate(questionId),
    renameChoice: (choiceId: number, label: string) => renameChoiceMutation.mutate({ choiceId, label }),
    deleteChoice: (choiceId: number) => deleteChoiceMutation.mutate(choiceId),
    reorderQuestions,
    publish: () => publishMutation.mutateAsync(),
    unpublish: () => unpublishMutation.mutateAsync(),
    isPublishing: publishMutation.isPending,
  };
}

/** The object `useFormEditor` returns, for components that receive it as a prop. */
export type FormEditor = ReturnType<typeof useFormEditor>;
