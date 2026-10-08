"use client";

/**
 * publish-button.tsx — the Publish control in the builder's header.
 *
 * What it does:   shows the right action for the form's state: a dark "Publish" for a
 *                 draft; for a live form a copy-link button, joined by a white
 *                 "Publish edits" while it has unpublished changes. The first publish plays a
 *                 short animation and then opens the Share page. Warns before a publish that
 *                 would delete stored answers.
 * Depends on:     ui/button.tsx, ui/modal.tsx, use-form-editor.ts, lib/api.ts, sonner.
 * Depended on by: builder-screen.tsx.
 */

import { Link2, Send, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";
import { responsesExportUrl } from "@/lib/api";
import type { FormDetail, RemovedOnPublish } from "@/lib/types";

import { PublishCelebration } from "./publish-celebration";
import type { FormEditor } from "./use-form-editor";

interface PublishButtonProps {
  form: FormDetail;
  editor: FormEditor;
}

// How long the publish animation plays before moving to the Share page.
const CELEBRATION_MS = 1900;

/** One line of the publish confirmation: 'The question "Email" (5 answers)'. */
function describeRemoved(removed: RemovedOnPublish): string {
  const answers = removed.answer_count === 1 ? "1 answer" : `${removed.answer_count} answers`;
  const questionTitle = removed.question_title === "" ? "an untitled question" : `"${removed.question_title}"`;
  if (removed.kind === "choice") {
    return `The choice "${removed.label}" of ${questionTitle} (${answers})`;
  }
  return removed.question_title === "" ? `An untitled question (${answers})` : `The question ${questionTitle} (${answers})`;
}

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

  return (
    <>
      {/* A draft gets the dark "Publish" button. Once the form is live, Typeform makes
          the button a quiet white "Publish edits", shown only while there are edits
          waiting, and keeps a copy-link button beside it. */}
      {!isLive && (
        <Button variant="primary" onClick={handleClick} disabled={editor.isPublishing || form.questions.length === 0}>
          <Send aria-hidden="true" className="h-4 w-4" />
          Publish
        </Button>
      )}
      {isLive && hasChanges && (
        <Button onClick={handleClick} disabled={editor.isPublishing || form.questions.length === 0}>
          <SendHorizontal aria-hidden="true" className="h-4 w-4" />
          Publish edits
        </Button>
      )}
      {isLive && (
        <Button iconOnly aria-label="Copy link" title="Copy link" onClick={() => void copyLink()}>
          <Link2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
      {isCelebrating && <PublishCelebration />}

      {/* The deletions may have been made many edits ago, so the dialog names each one:
          a bare "5 answers will be deleted" looks unrelated to the edit being published. */}
      <Modal isOpen={isConfirming} onClose={() => setIsConfirming(false)} title="Publish and delete answers?">
        <div className="text-admin-text">
          <p>
            You deleted these from the form after people had answered them. Publishing takes them off the live form
            and permanently deletes those answers:
          </p>
          <ul className="mt-4 list-disc pl-10">
            {form.removed_on_publish.map((removed, index) => (
              <li key={index}>{describeRemoved(removed)}</li>
            ))}
          </ul>
          <p className="mt-5">
            Need your data?{" "}
            <a href={responsesExportUrl(form.id, "csv", [])} className="underline underline-offset-2">
              Download your responses
            </a>{" "}
            before publishing.
          </p>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setIsConfirming(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void publish()}>
            Publish and delete
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
