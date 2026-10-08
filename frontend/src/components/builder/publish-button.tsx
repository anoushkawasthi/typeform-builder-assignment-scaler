"use client";

/**
 * publish-button.tsx — the Publish control in the builder's header.
 *
 * What it does:   shows the form's status and the right action for it: "Publish" for a
 *                 draft, "Publish edits" when a live form has unpublished changes, and a
 *                 quiet "Published" when everything is live. Warns before a publish that
 *                 would delete stored answers.
 * Depends on:     ui/button.tsx, ui/modal.tsx, use-form-editor.ts, sonner.
 * Depended on by: builder-screen.tsx.
 */

import { Check, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";
import type { FormDetail } from "@/lib/types";

import type { FormEditor } from "./use-form-editor";

interface PublishButtonProps {
  form: FormDetail;
  editor: FormEditor;
}

/** The address respondents use. Built from wherever the app is currently running. */
export function publicFormUrl(publicId: string): string {
  return `${window.location.origin}/to/${publicId}`;
}

export function PublishButton({ form, editor }: PublishButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const isLive = form.status === "published";
  const hasChanges = form.has_unpublished_changes;

  async function publish() {
    setIsConfirming(false);
    try {
      const published = await editor.publish();
      toast.success(isLive ? "Your edits are live" : "Form published", {
        action: {
          label: "Copy link",
          onClick: () => {
            void navigator.clipboard.writeText(publicFormUrl(published.public_id));
            toast.success("Link copied");
          },
        },
      });
    } catch {
      // The editor already showed the server's message in a toast.
    }
  }

  function handleClick() {
    // Answers to questions or choices removed from the draft are deleted for good when
    // this publish replaces the live form, so ask first.
    if (form.answers_lost_on_publish > 0) {
      setIsConfirming(true);
    } else {
      void publish();
    }
  }

  if (isLive && !hasChanges) {
    return (
      <span className="flex h-8 items-center gap-2 rounded-lg bg-status-green-bg px-3 font-medium text-status-green">
        <Check aria-hidden="true" className="h-4 w-4" />
        Published
      </span>
    );
  }

  return (
    <>
      <Button variant="primary" onClick={handleClick} disabled={editor.isPublishing || form.questions.length === 0}>
        <Send aria-hidden="true" className="h-4 w-4" />
        {isLive ? "Publish edits" : "Publish"}
      </Button>

      <Modal
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        title="Publish and delete answers?"
        description={
          `You removed questions or choices that people have already answered. Publishing will permanently ` +
          `delete ${form.answers_lost_on_publish} stored ${form.answers_lost_on_publish === 1 ? "answer" : "answers"}. ` +
          `This can't be undone.`
        }
      >
        <ModalActions>
          <Button onClick={() => setIsConfirming(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void publish()}>
            Publish and delete
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
