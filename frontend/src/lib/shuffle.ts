/**
 * shuffle.ts — putting a question's choices in a random order.
 *
 * What it does:   `shuffled` returns a randomly ordered copy of a list;
 *                 `withRandomizedChoices` applies it to every question whose
 *                 "Randomize" setting is on.
 * Depends on:     lib/types.ts.
 * Depended on by: components/respondent/form-flow.tsx.
 *
 * Only the order on screen changes. Answers, logic jumps and results refer to a choice
 * by its id, never by its position, so nothing else needs to know about the shuffle.
 */

import type { RenderableQuestion } from "./types";

/**
 * The Fisher-Yates shuffle: walk the list from the end, and swap each item with a
 * randomly picked item at or before it. Every possible order is equally likely.
 */
export function shuffled<Item>(items: Item[]): Item[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const otherIndex = Math.floor(Math.random() * (index + 1));
    const held = copy[index];
    copy[index] = copy[otherIndex];
    copy[otherIndex] = held;
  }
  return copy;
}

/** The same questions, with the choices of every "Randomize" question shuffled. */
export function withRandomizedChoices(questions: RenderableQuestion[]): RenderableQuestion[] {
  return questions.map((question) => {
    if (!question.randomize_choices) {
      return question;
    }
    return { ...question, choices: shuffled(question.choices) };
  });
}
