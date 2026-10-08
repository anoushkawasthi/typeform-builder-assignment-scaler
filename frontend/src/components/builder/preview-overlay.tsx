"use client";

/**
 * preview-overlay.tsx — try the whole form without leaving the builder.
 *
 * What it does:   covers the page with a white layer holding a framed copy of the form,
 *                 as Typeform's preview does. A small bar on top has Close, a
 *                 desktop / mobile switch, and Restart. The frame runs the DRAFT of the
 *                 form through the same FormFlow the public form uses, with a submit
 *                 that saves nothing.
 * Depends on:     respondent/form-flow.tsx, lib/types.ts.
 * Depended on by: builder-screen.tsx (the play button) and preview-screen.tsx (the
 *                 /forms/[id]/preview address).
 */

import { Monitor, RotateCw, Smartphone, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { FormFlow } from "@/components/respondent/form-flow";
import type { FillableForm, FormDetail } from "@/lib/types";

interface PreviewOverlayProps {
  form: FormDetail;
  onClose: () => void;
}

const BAR_BUTTON_CLASSES = "flex h-8 w-8 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover";

export function PreviewOverlay({ form, onClose }: PreviewOverlayProps) {
  const [isMobileView, setIsMobileView] = useState(false);
  // Changing this number remounts FormFlow, which is the simplest way to start over.
  const [restartCount, setRestartCount] = useState(0);

  // Escape closes the preview, like any other overlay.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // The draft has everything a published form has, so it can be previewed as is.
  const fillableForm: FillableForm = {
    title: form.title,
    theme: form.theme,
    welcome: form.welcome_enabled
      ? { title: form.welcome_title, text: form.welcome_text, button_text: form.welcome_button_text }
      : null,
    thank_you_title: form.thank_you_title,
    thank_you_text: form.thank_you_text,
    questions: form.questions,
  };

  return (
    // Typeform's preview eases in rather than appearing at once: the white layer fades
    // in while the frame (below) rises slightly into place.
    <motion.div
      role="dialog"
      aria-label="Preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center overflow-auto bg-white px-4 pb-6"
    >
      <div className="mt-5 flex shrink-0 items-center gap-2 rounded-xl bg-admin-panel p-2">
        <button type="button" aria-label="Close preview" title="Close preview" onClick={onClose} className={BAR_BUTTON_CLASSES}>
          <X className="h-4 w-4" />
        </button>
        <span className="h-4 w-px bg-admin-border" />
        <button
          type="button"
          // The button names the view you would switch TO, as Typeform's does.
          aria-label={isMobileView ? "Desktop view" : "Mobile view"}
          title={isMobileView ? "Desktop view" : "Mobile view"}
          onClick={() => setIsMobileView(!isMobileView)}
          className={BAR_BUTTON_CLASSES}
        >
          {isMobileView ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
        </button>
        <span className="h-4 w-px bg-admin-border" />
        <button
          type="button"
          aria-label="Restart preview"
          title="Restart"
          onClick={() => setRestartCount((count) => count + 1)}
          className={BAR_BUTTON_CLASSES}
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>

      {/* The frame. `relative` makes it the box that the embedded form fills, and its
          width is what the form's own layout responds to (see form-theme.tsx), so the
          phone-sized frame really shows the phone layout. */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className={
          "relative mt-[min(72px,6dvh)] shrink-0 overflow-hidden border border-admin-border-soft shadow-[0_1px_4px_rgba(60,50,62,0.08)] " +
          "transition-[width,height] duration-300 " +
          (isMobileView
            ? "h-[min(640px,calc(100dvh-190px))] w-[360px] max-w-full"
            : "h-[min(578px,calc(100dvh-190px))] w-[min(1026px,100%)]")
        }
      >
        <FormFlow
          key={restartCount}
          form={fillableForm}
          isEmbedded
          // Nothing is sent anywhere: the preview only pretends to submit.
          onSubmit={async () => {}}
        />
      </motion.div>

      <p className="mt-3 text-[12px] text-admin-muted">Preview of your draft. Answers given here are not saved.</p>
    </motion.div>
  );
}
