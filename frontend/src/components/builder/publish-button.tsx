"use client";

/**
 * publish-button.tsx — the Publish control in the builder's header.
 *
 * What it does:   shows the right action for the form's state: "Publish" for a draft,
 *                 "Publish edits" when a live form has unpublished changes, and a
 *                 copy-link button when everything is live. The first publish plays a
 *                 short animation and then opens the Share page. Warns before a publish that
 *                 would delete stored answers.
 * Depends on:     ui/button.tsx, ui/modal.tsx, use-form-editor.ts, sonner.
 * Depended on by: builder-screen.tsx.
 */

import { Link2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";
import type { FormDetail } from "@/lib/types";

import { PublishCelebration } from "./publish-celebration";
import type { FormEditor } from "./use-form-editor";

interface PublishButtonProps {
  form: FormDetail;
  editor: FormEditor;
}

// How long the publish animation plays before moving to the Share page.
const CELEBRATION_MS = 1900;

/** The address respondents use. Built from wherever the app is currently running. */
export function publicFormUrl(publicId: string): string {
  return `${window.location.origin}/to/${publicId}`;
}

export function PublishButton({ form, editor }: PublishButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);

  const isLive = form.status === "published";
  const hasChanges = form.has_unpublished_changes;

  async function publish() {
    setIsConfirming(false);
    const isFirstPublish = !isLive;
    try {
      const published = await editor.publish();
      if (isFirstPublish) {
        // The first publish is a moment worth marking, as Typeform does: play the
        // animation, then go to the Share page, where the new link is.
        setIsCelebrating(true);
        window.setTimeout(
          () => router.push(`/forms/${published.id}/share`),
          CELEBRATION_MS,
        );
      } else {
        toast.success("Your edits are live");
      }
    } catch {
      // The editor already showed the server's message in a toast.
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicFormUrl(form.public_id));
    toast.success("Link copied");
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

  // Published with nothing waiting: Typeform shows a copy-link button here.
  if (isLive && !hasChanges) {
    return (
      <>
        <Button
          iconOnly
          aria-label="Copy link"
          title="Copy link"
          onClick={() => void copyLink()}
        >
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </Button>
        {isCelebrating && <PublishCelebration />}
      </>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={handleClick}
        disabled={editor.isPublishing || form.questions.length === 0}
      >
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
