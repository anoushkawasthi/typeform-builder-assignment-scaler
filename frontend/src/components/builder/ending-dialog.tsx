"use client";

/**
 * ending-dialog.tsx — editing the thank-you screen.
 *
 * What it does:   a dialog with the title and message respondents see after submitting.
 *                 Both fields save themselves.
 * Depends on:     ui/modal.tsx, ui/autosave-text.tsx.
 * Depended on by: builder-screen.tsx (opened from the Endings card and the gear button).
 */

import { AutosaveText } from "@/components/ui/autosave-text";
import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";
import type { FormDetail, FormUpdate } from "@/lib/types";

interface EndingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  form: FormDetail;
  onUpdate: (changes: FormUpdate) => void;
}

const FIELD_CLASSES =
  "rounded-lg border border-admin-border px-3 py-2 text-[16px] leading-6 text-admin-text focus:border-admin-text";

export function EndingDialog({ isOpen, onClose, form, onUpdate }: EndingDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thank-you screen"
      description="Shown to respondents after they submit the form."
    >
      <label className="mt-2 block">
        <span className="mb-1 block text-admin-muted">Title</span>
        <AutosaveText
          value={form.thank_you_title}
          onSave={(title) => onUpdate({ thank_you_title: title })}
          ariaLabel="Thank-you title"
          className={FIELD_CLASSES}
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1 block text-admin-muted">Message</span>
        <AutosaveText
          value={form.thank_you_text}
          onSave={(text) => onUpdate({ thank_you_text: text })}
          ariaLabel="Thank-you message"
          allowLineBreaks
          className={`${FIELD_CLASSES} min-h-[72px]`}
        />
      </label>
      <ModalActions>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </ModalActions>
    </Modal>
  );
}
