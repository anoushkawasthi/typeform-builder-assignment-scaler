"use client";

/**
 * form-flow.tsx — the one-question-at-a-time experience.
 *
 * What it does:   holds the respondent's position and answers, shows one question at a
 *                 time with the slide-and-fade transition, handles the keyboard,
 *                 validates before moving on, and submits at the end.
 * Depends on:     question-screen.tsx, form-theme.tsx, thank-you-screen.tsx,
 *                 progress-bar.tsx, flow-footer.tsx, lib/validation.ts, lib/logic.ts,
 *                 motion.
 * Depended on by: public-form-screen.tsx (the real form) and
 *                 components/builder/preview-screen.tsx (the builder's preview).
 *
 * It knows nothing about the API. The parent passes `onSubmit`, which is how the public
 * form saves a response and the preview saves nothing, with the same UI.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AnswerError, AnswerMap, AnswerPayload, AnswerValue, FillableForm } from "@/lib/types";
import { nextQuestionIndex, visitedIndexes } from "@/lib/logic";
import { isAnswerEmpty, toAnswerPayloads, validateAnswer } from "@/lib/validation";

import { FlowFooter } from "./flow-footer";
import { FormTheme } from "./form-theme";
import { ProgressBar } from "./progress-bar";
import { QuestionScreen } from "./question-screen";
import { ThankYouScreen } from "./thank-you-screen";
import { WelcomeScreen } from "./welcome-screen";

interface FormFlowProps {
  form: FillableForm;
  /** Called once, the first time the respondent answers anything. */
  onStart?: () => void;
  /**
   * Save the answers. If the server rejects some of them, it should throw an error
   * that has an `answerErrors` list; the flow then jumps to the first one.
   */
  onSubmit: (answers: AnswerPayload[]) => Promise<void>;
  /**
   * False (default): the form covers the whole browser window, as on the public link.
   * True: it fills the box it is placed in, as in the builder's preview frame.
   */
  isEmbedded?: boolean;
}

// The value of `currentIndex` while the welcome screen is showing.
const WELCOME_INDEX = -1;

// +1 = moving forward (new question comes up from below), -1 = moving back.
type Direction = 1 | -1;

// Measured on Typeform: a question travels 60% of its own height while fading.
const SLIDE_DISTANCE = "60%";
// Typeform's change of question is unhurried; these were tuned by eye against it.
const SLIDE_SECONDS = 0.6;
const FADE_SECONDS = 0.4;
// A strong ease-out: fast at first, then settling.
const SLIDE_EASING: [number, number, number, number] = [0.16, 1, 0.3, 1];

function hasAnswerErrors(error: unknown): error is { answerErrors: AnswerError[] } {
  return typeof error === "object" && error !== null && Array.isArray((error as { answerErrors?: unknown }).answerErrors);
}

export function FormFlow({ form, onStart, onSubmit, isEmbedded = false }: FormFlowProps) {
  const questions = form.questions;

  const welcome = form.welcome ?? null;

  // Which screen is showing. 0..n-1 are questions; n is the thank-you screen; -1 is the
  // welcome screen, which is where a form that has one starts.
  const [currentIndex, setCurrentIndex] = useState(welcome === null ? 0 : WELCOME_INDEX);
  const [direction, setDirection] = useState<Direction>(1);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Why a ref as well as state: a single-select choice calls onCommit a moment after
  // onChange, from a timer created before React re-rendered. A function captured at
  // that time would still see the old `answers`. The ref always holds the newest ones.
  const answersRef = useRef<AnswerMap>({});
  const hasStartedRef = useRef(false);

  const prefersReducedMotion = useReducedMotion();
  const isFinished = currentIndex >= questions.length;
  const isOnWelcome = currentIndex === WELCOME_INDEX;

  function handleAnswerChange(questionId: number, value: AnswerValue) {
    const nextAnswers = { ...answersRef.current, [questionId]: value };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    // Typeform clears the error as soon as the answer is edited.
    setError(null);

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      onStart?.();
    }
  }

  function goToIndex(index: number, newDirection: Direction) {
    setDirection(newDirection);
    setCurrentIndex(index);
    setError(null);
  }

  async function submit() {
    setIsSubmitting(true);
    try {
      await onSubmit(toAnswerPayloads(questions, answersRef.current));
      goToIndex(questions.length, 1);
    } catch (submitError) {
      // The server found a problem the browser check missed: go to the first
      // question it complained about and show its message there.
      if (hasAnswerErrors(submitError) && submitError.answerErrors.length > 0) {
        const firstError = submitError.answerErrors[0];
        const failingIndex = questions.findIndex((question) => question.id === firstError.question_id);
        if (failingIndex !== -1) {
          goToIndex(failingIndex, -1);
          setError(firstError.message);
          return;
        }
      }
      setError("We couldn't submit your answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Validate the current question, then go to the next one. When there is no next
   * question the form is submitted, but only if `canSubmit` allows it.
   */
  const moveOn = useCallback(
    (canSubmit: boolean) => {
      if (isFinished || isSubmitting) {
        return;
      }
      // Nothing to validate on the welcome screen: Start simply shows question 1.
      if (currentIndex === WELCOME_INDEX) {
        goToIndex(0, 1);
        return;
      }
      const question = questions[currentIndex];
      const message = validateAnswer(question, answersRef.current[question.id]);
      if (message !== null) {
        setError(message);
        return;
      }
      // Usually the next question; a logic jump may send us further ahead or to the end.
      const nextIndex = nextQuestionIndex(questions, currentIndex, answersRef.current[question.id]);
      if (nextIndex < questions.length) {
        goToIndex(nextIndex, 1);
      } else if (canSubmit) {
        void submit();
      }
    },
    // `submit` and `goToIndex` only use state setters and refs, which never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, isFinished, isSubmitting, questions],
  );

  /** Enter, OK, Submit and picking a choice: go on, and submit at the end. */
  const advance = useCallback(() => moveOn(true), [moveOn]);

  /**
   * The ArrowDown key: go on, but never submit. Sending the form should be a
   * deliberate act (Enter or the Submit button), not a stray press of an arrow key.
   */
  const goForward = useCallback(() => moveOn(false), [moveOn]);

  const goBack = useCallback(() => {
    if (isFinished || isSubmitting || currentIndex <= 0) {
      return;
    }
    // Go back along the path actually taken, so a question that a logic jump skipped
    // on the way here is skipped on the way back too.
    const pathSoFar = visitedIndexes(questions, answersRef.current, currentIndex);
    const previousIndex = pathSoFar.length > 0 ? pathSoFar[pathSoFar.length - 1] : currentIndex - 1;
    goToIndex(previousIndex, -1);
  }, [currentIndex, isFinished, isSubmitting, questions]);

  // Keyboard navigation for the whole form. Letter and number shortcuts for choices and
  // ratings live in their own components; this handles Enter and the arrow keys.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // What the key was pressed on. Usually the focused field or button; the page
      // body when nothing is focused.
      const target = event.target instanceof HTMLElement ? event.target : document.body;
      const role = target.getAttribute("role");
      const isTextarea = target.tagName === "TEXTAREA";
      const isChoice = role === "radio" || role === "checkbox";

      // Ctrl+Enter (Cmd+Enter on a Mac) always confirms, wherever the cursor is. On the
      // last question that submits the form, which is what the hint beside Submit says.
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        advance();
        return;
      }

      if (event.key === "Enter") {
        // Shift+Enter in a long-text answer is a line break, not "next".
        if (isTextarea && event.shiftKey) {
          return;
        }
        // Enter on the OK or arrow buttons should just click them as usual.
        if (target.tagName === "BUTTON" && !isChoice) {
          return;
        }
        event.preventDefault();
        advance();
        return;
      }

      // Arrow keys move between questions. (A dropdown uses them to move through its
      // options and stops the event itself, so those presses never arrive here.)
      //
      // In a long answer they first move the cursor, and change question only when the
      // cursor can go no further: ArrowUp at the very start, ArrowDown at the very end.
      if (target instanceof HTMLTextAreaElement) {
        const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
        const isAtEnd = target.selectionStart === target.value.length;
        if (event.key === "ArrowUp" && !isAtStart) {
          return;
        }
        if (event.key === "ArrowDown" && !isAtEnd) {
          return;
        }
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        goForward();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        goBack();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advance, goForward, goBack]);

  // Progress counts answered questions, as Typeform does, not the position on screen.
  let answeredCount = 0;
  for (const question of questions) {
    if (!isAnswerEmpty(question, answers[question.id])) {
      answeredCount += 1;
    }
  }

  // True whenever answering the current question would end the form, which with logic
  // jumps is not only on the final question. It turns OK into Submit and switches off
  // the footer's "next" arrow.
  const isOnQuestion = !isFinished && !isOnWelcome && questions.length > 0;
  const isLastQuestion =
    isOnQuestion && nextQuestionIndex(questions, currentIndex, answers[questions[currentIndex].id]) >= questions.length;

  const slideDistance = prefersReducedMotion ? "0%" : SLIDE_DISTANCE;
  const slideVariants = {
    // `slideDirection` is the value passed as `custom` below.
    enter: (slideDirection: Direction) => ({
      y: slideDirection === 1 ? slideDistance : `-${slideDistance}`,
      opacity: 0,
    }),
    center: { y: "0%", opacity: 1 },
    exit: (slideDirection: Direction) => ({
      y: slideDirection === 1 ? `-${slideDistance}` : slideDistance,
      opacity: 0,
    }),
  };

  if (questions.length === 0) {
    return (
      <FormTheme theme={form.theme} className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-[20px] text-form-question">This form has no questions yet.</p>
      </FormTheme>
    );
  }

  return (
    <FormTheme theme={form.theme} className={(isEmbedded ? "absolute" : "fixed") + " inset-0 overflow-hidden"}>
      {!isFinished && !isOnWelcome && <ProgressBar answered={answeredCount} total={questions.length} />}

      {/* Every screen is placed in the same grid cell, so the outgoing and incoming
          questions overlap while they cross-fade instead of pushing each other around. */}
      <main className="grid h-full grid-cols-1 grid-rows-1 overflow-y-auto overflow-x-hidden">
        {/* `custom` hands the direction to the exit animation of a question that is
            already leaving. The very first screen animates in too, so the form arrives
            with the same rise-and-fade as every later question. */}
        <AnimatePresence custom={direction}>
          <motion.div
            key={isFinished ? "thank-you" : isOnWelcome ? "welcome" : questions[currentIndex].id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              y: { duration: SLIDE_SECONDS, ease: SLIDE_EASING },
              opacity: { duration: FADE_SECONDS, ease: "easeOut" },
            }}
            // Typeform pads the block 35px above and much more below (172px on phones,
            // to clear the bottom bar; 88px on wide screens), so although it is centred
            // it sits a little above the middle of the window.
            className="col-start-1 row-start-1 flex w-full items-center justify-center self-center px-8 pb-[172px] pt-[35px] @2xl:px-20 @2xl:pb-[88px]"
          >
            <div className="w-full max-w-[720px]">
              {isFinished ? (
                <ThankYouScreen title={form.thank_you_title} text={form.thank_you_text} />
              ) : isOnWelcome && welcome !== null ? (
                <WelcomeScreen title={welcome.title} text={welcome.text} buttonText={welcome.button_text} onStart={advance} />
              ) : (
                <QuestionScreen
                  question={questions[currentIndex]}
                  number={currentIndex + 1}
                  value={answers[questions[currentIndex].id]}
                  onChange={(value) => handleAnswerChange(questions[currentIndex].id, value)}
                  onCommit={advance}
                  isActive={true}
                  isInteractive={true}
                  error={error}
                  isLastQuestion={isLastQuestion}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <FlowFooter
        showNavigation={!isFinished && !isOnWelcome}
        canGoBack={currentIndex > 0}
        canGoForward={!isLastQuestion}
        isFinished={isFinished}
        onPrevious={goBack}
        onNext={goForward}
        advanceLabel={isSubmitting ? "Submitting..." : isLastQuestion ? "Submit" : "OK"}
        onAdvance={advance}
        isSubmitting={isSubmitting}
      />
    </FormTheme>
  );
}
