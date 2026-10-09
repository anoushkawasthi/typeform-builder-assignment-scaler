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
 *
 * Two edits are shown before the server confirms them, because waiting would be felt:
 * reordering questions (the dragged card would snap back) and adding a choice (see
 * "Choices shown before the server has created them" below).
 */

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import * as api from "@/lib/api";
import type { Choice, FormDetail, FormUpdate, LogicJumpInput, QuestionType, QuestionUpdate } from "@/lib/types";

/** The cache key under which a form is stored. Shared by every screen that shows it. */
export function formQueryKey(formId: number) {
  return ["form", formId];
}

// Every save uses this key so we can count how many saves are in flight ("Saving...").
const SAVE_MUTATION_KEY = ["form-save"];

export function useFormEditor(formId: number) {
  const queryClient = useQueryClient();

  // ---- Choices shown before the server has created them ------------------------------
  //
  // Pressing Enter in a choice adds the next one, and the creator keeps typing. If the
  // new box only appeared when the server replied (a few tenths of a second, sometimes
  // over a second on the hosted site), those keystrokes landed in the old box. So the
  // new box is shown at once, under a temporary id: a negative number, which can never
  // clash with a real id.
  //
  // Refs, not state: these are bookkeeping for the functions below, read only when an
  // edit is made or a reply arrives, and never while drawing the screen.
  const lastTemporaryIdRef = useRef(0);
  // Choices on screen that the server has not confirmed yet.
  const pendingChoicesRef = useRef<{ questionId: number; temporaryId: number }[]>([]);
  // Once confirmed: temporary id -> real id, and the same pairs the other way round.
  const realIdByTemporaryIdRef = useRef(new Map<number, number>());
  const temporaryIdByRealIdRef = useRef(new Map<number, number>());

  /**
   * The id to send to the server for a choice. Saves run one at a time in the order
   * they were made, so by the time a rename of a temporary choice is sent, the request
   * that created it has finished and its real id is known.
   */
  function serverChoiceId(choiceId: number): number {
    return realIdByTemporaryIdRef.current.get(choiceId) ?? choiceId;
  }

  function forgetPendingChoice(temporaryId: number) {
    pendingChoicesRef.current = pendingChoicesRef.current.filter((pending) => pending.temporaryId !== temporaryId);
  }

  /**
   * A form as the server sent it, plus what only this page knows about its choices:
   *  - a choice first shown under a temporary id keeps that id as its `row_key`, so React
   *    sees the same row before and after, and the text box in it keeps its cursor;
   *  - choices the server has not created yet are put back at the end of their question
   *    (a reply to an earlier save does not know about them).
   */
  function withLocalChoices(form: FormDetail): FormDetail {
    const questions = form.questions.map((question) => {
      const choices: Choice[] = question.choices.map((choice) => {
        const temporaryId = temporaryIdByRealIdRef.current.get(choice.id);
        if (temporaryId === undefined) {
          return choice;
        }
        return { ...choice, row_key: temporaryId };
      });
      for (const pending of pendingChoicesRef.current) {
        if (pending.questionId === question.id) {
          choices.push({ id: pending.temporaryId, label: "", row_key: pending.temporaryId });
        }
      }
      return { ...question, choices };
    });
    return { ...form, questions };
  }

  const formQuery = useQuery({
    queryKey: formQueryKey(formId),
    queryFn: async () => withLocalChoices(await api.getForm(formId)),
  });

  /** Put a form returned by the server into the cache, replacing the old one. */
  function storeForm(form: FormDetail) {
    queryClient.setQueryData(formQueryKey(formId), withLocalChoices(form));
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
  const duplicateQuestionMutation = useMutation({
    ...saveOptions,
    mutationFn: (questionId: number) => api.duplicateQuestion(questionId),
  });
  const deleteQuestionMutation = useMutation({
    ...saveOptions,
    mutationFn: (questionId: number) => api.deleteQuestion(questionId),
  });
  const addChoiceMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { questionId: number; temporaryId: number }) => api.createChoice(variables.questionId, ""),
    onSuccess: (form, variables) => {
      // The server adds a new choice to the end of its question, so the last choice in
      // the reply is the one this request created. Remember which temporary id it was.
      const question = form.questions.find((candidate) => candidate.id === variables.questionId);
      const created = question?.choices.at(-1);
      if (created !== undefined) {
        realIdByTemporaryIdRef.current.set(variables.temporaryId, created.id);
        temporaryIdByRealIdRef.current.set(created.id, variables.temporaryId);
      }
      forgetPendingChoice(variables.temporaryId);
      storeForm(form);
    },
    onError: (error: Error, variables) => {
      // The choice was never created: take its box off the screen again.
      forgetPendingChoice(variables.temporaryId);
      const current = queryClient.getQueryData<FormDetail>(formQueryKey(formId));
      if (current !== undefined) {
        const questions = current.questions.map((question) => ({
          ...question,
          choices: question.choices.filter((choice) => choice.id !== variables.temporaryId),
        }));
        queryClient.setQueryData(formQueryKey(formId), { ...current, questions });
      }
      toast.error(error.message);
    },
  });
  // The three mutations below may be given a temporary id; `serverChoiceId` turns it
  // into the real one at the moment the request is sent.
  const renameChoiceMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { choiceId: number; label: string }) =>
      api.updateChoice(serverChoiceId(variables.choiceId), variables.label),
  });
  const reorderChoicesMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { questionId: number; choiceIds: number[] }) =>
      api.reorderChoices(variables.questionId, variables.choiceIds.map(serverChoiceId)),
  });
  const deleteChoiceMutation = useMutation({
    ...saveOptions,
    mutationFn: (choiceId: number) => api.deleteChoice(serverChoiceId(choiceId)),
  });
  const addLogicJumpMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { questionId: number; rule: LogicJumpInput }) =>
      api.createLogicJump(variables.questionId, variables.rule),
  });
  const replaceLogicJumpMutation = useMutation({
    ...saveOptions,
    mutationFn: (variables: { logicJumpId: number; rule: LogicJumpInput }) =>
      api.replaceLogicJump(variables.logicJumpId, variables.rule),
  });
  const deleteLogicJumpMutation = useMutation({
    ...saveOptions,
    mutationFn: (logicJumpId: number) => api.deleteLogicJump(logicJumpId),
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

  /** Show a new, empty choice at once, and ask the server to create it. */
  function addChoice(questionId: number) {
    lastTemporaryIdRef.current -= 1;
    const temporaryId = lastTemporaryIdRef.current;
    pendingChoicesRef.current.push({ questionId, temporaryId });

    const current = queryClient.getQueryData<FormDetail>(formQueryKey(formId));
    if (current !== undefined) {
      const newChoice: Choice = { id: temporaryId, label: "", row_key: temporaryId };
      const questions = current.questions.map((question) => {
        if (question.id !== questionId) {
          return question;
        }
        return { ...question, choices: [...question.choices, newChoice] };
      });
      queryClient.setQueryData(formQueryKey(formId), { ...current, questions });
    }
    addChoiceMutation.mutate({ questionId, temporaryId });
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
    duplicateQuestion: (questionId: number) => duplicateQuestionMutation.mutateAsync(questionId),
    deleteQuestion: (questionId: number) => deleteQuestionMutation.mutateAsync(questionId),
    addChoice,
    renameChoice: (choiceId: number, label: string) => renameChoiceMutation.mutate({ choiceId, label }),
    deleteChoice: (choiceId: number) => deleteChoiceMutation.mutate(choiceId),
    reorderChoices: (questionId: number, choiceIds: number[]) =>
      reorderChoicesMutation.mutate({ questionId, choiceIds }),
    addLogicJump: (questionId: number, rule: LogicJumpInput) => addLogicJumpMutation.mutate({ questionId, rule }),
    replaceLogicJump: (logicJumpId: number, rule: LogicJumpInput) =>
      replaceLogicJumpMutation.mutate({ logicJumpId, rule }),
    deleteLogicJump: (logicJumpId: number) => deleteLogicJumpMutation.mutate(logicJumpId),
    reorderQuestions,
    publish: () => publishMutation.mutateAsync(),
    unpublish: () => unpublishMutation.mutateAsync(),
    isPublishing: publishMutation.isPending,
  };
}

/** The object `useFormEditor` returns, for components that receive it as a prop. */
export type FormEditor = ReturnType<typeof useFormEditor>;
