"use client";

/**
 * share-screen.tsx — the Share tab of a form.
 *
 * What it does:   laid out like Typeform's Share page: a centred heading, a card with
 *                 "Copy link" and the public address, a link preview, and the embed
 *                 options (placeholders). A draft shows a Publish prompt instead, and a
 *                 published form can be unpublished from here.
 * Depends on:     use-form-editor.ts, publish-button.tsx, ui/form-header.tsx,
 *                 ui/button.tsx, ui/coming-soon.tsx.
 * Depended on by: app/forms/[id]/share/page.tsx.
 */

import { ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { FormHeader } from "@/components/ui/form-header";

import { PublishButton, publicFormUrl } from "./publish-button";
import { useFormEditor } from "./use-form-editor";

export function ShareScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const form = editor.form;

  if (editor.isLoading) {
    return <p className="p-8 text-admin-muted">Loading form...</p>;
  }
  if (form === undefined) {
    return <p className="p-8 text-admin-text">This form could not be found.</p>;
  }

  const isLive = form.status === "published";
  const link = publicFormUrl(form.public_id);
  // The link without "https://", for the small grey line of the preview card.
  const linkHost = new URL(link).host;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  async function unpublish() {
    try {
      await editor.unpublish();
      toast.success("Form unpublished. The link no longer accepts responses.");
    } catch {
      // The editor already showed the error in a toast.
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <FormHeader
        formId={form.id}
        formTitle={form.title}
        activeSection="share"
        onRename={(title) => editor.updateForm({ title })}
        actions={<PublishButton form={form} editor={editor} />}
      />

      <main className="mx-4 mb-4 flex-1 rounded-xl bg-admin-panel px-4 pb-12 pt-[124px]">
        <div className="mx-auto max-w-[626px]">
          <h1 className="text-center text-[24px] leading-8 text-black">
            {isLive ? "Choose how you’d like to share your form" : "Publish your form to share it"}
          </h1>

          <section className="mt-12 rounded-xl bg-white p-6">
            {isLive ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => void copyLink()}>
                    <Link2 aria-hidden="true" className="h-4 w-4" />
                    Copy link
                  </Button>
                  <input
                    readOnly
                    value={link}
                    aria-label="Public link"
                    onFocus={(event) => event.target.select()}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-admin-border bg-white px-3 text-admin-text outline-none"
                  />
                  <Link
                    href={`/to/${form.public_id}`}
                    target="_blank"
                    aria-label="Open the form in a new tab"
                    title="Open the form"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>

                {form.has_unpublished_changes && (
                  <p className="mt-3 text-[13px] text-admin-muted">
                    You have edits that are not live yet. Respondents see the last published version until you publish
                    again.
                  </p>
                )}

                <div className="mt-6 border-t border-admin-border pt-6">
                  <p className="text-admin-muted">Link preview</p>
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-admin-border p-3">
                    <span className="flex h-16 w-28 shrink-0 items-center justify-center gap-[3px] rounded-lg bg-admin-panel">
                      <span className="h-3 w-[4px] rounded-[2px] bg-admin-text" />
                      <span className="h-3 w-[10px] rounded-[3px] bg-admin-text" />
                      <span className="ml-1 text-[10px] font-medium text-admin-text">Typeform Replica</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-admin-text">{form.title}</span>
                      <span className="block truncate text-[13px] text-admin-muted">
                        Fill in this form. It takes a few minutes and needs no account.
                      </span>
                      <span className="block truncate text-[12px] text-admin-muted">{linkHost}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-admin-border pt-4">
                  <span className="text-admin-muted">Stop accepting responses</span>
                  <Button onClick={() => void unpublish()}>Unpublish</Button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-admin-muted">
                  {form.questions.length === 0
                    ? "Add at least one question, then publish to get a shareable link."
                    : "This form is a draft. Publish it to get a link you can share."}
                </p>
                <div className="mt-4 flex justify-center">
                  <PublishButton form={form} editor={editor} />
                </div>
              </div>
            )}
          </section>

          <h2 className="mt-12 text-admin-text">Embed form</h2>
          <div className="mt-2 grid gap-8 sm:grid-cols-2">
            {[
              { label: "On your website", color: "#C993E0" },
              { label: "In your email", color: "#B5DAFB" },
            ].map((item) => (
              <div key={item.label} className="flex h-24 overflow-hidden rounded-xl border border-admin-border bg-white">
                <span className="w-36 shrink-0" style={{ backgroundColor: item.color }} />
                <span className="flex flex-col items-start gap-2 p-3 text-admin-text">
                  {item.label}
                  <ComingSoonBadge />
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
