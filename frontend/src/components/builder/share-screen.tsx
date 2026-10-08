"use client";

/**
 * share-screen.tsx — the Share tab of a form.
 *
 * What it does:   laid out like Typeform's Share page: a centred heading, a card with
 *                 "Copy link", the public address and a QR code button, a link
 *                 preview, and the embed options (placeholders). A draft shows a
 *                 Publish prompt instead, and a published form can be unpublished from
 *                 the bottom of the page.
 * Depends on:     use-form-editor.ts, publish-button.tsx, ui/form-header.tsx,
 *                 ui/button.tsx, ui/modal.tsx, qrcode.react (draws the QR code), sonner.
 * Depended on by: app/forms/[id]/share/page.tsx.
 */

import { ChevronDown, Link2, Pencil, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Modal } from "@/components/ui/modal";

import { PublishButton, publicFormUrl } from "./publish-button";
import { useFormEditor } from "./use-form-editor";

export function ShareScreen({ formId }: { formId: number }) {
  const editor = useFormEditor(formId);
  const form = editor.form;
  const [isQrOpen, setIsQrOpen] = useState(false);

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
        hasBeenPublished={form.published_at !== null}
        onRename={(title) => editor.updateForm({ title })}
        actions={<PublishButton form={form} editor={editor} />}
      />

      <main className="mx-4 mb-4 flex-1 rounded-xl bg-admin-panel px-4 pb-12 pt-[78px]">
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
                  {/* The address, with Typeform's "Edit" at its right end. Choosing your
                      own address is a paid Typeform feature, so here it only says so. */}
                  <div className="flex h-8 min-w-0 flex-1 items-center rounded-lg border border-admin-border bg-white pr-1">
                    <input
                      readOnly
                      value={link}
                      aria-label="Public link"
                      onFocus={(event) => event.target.select()}
                      className="h-full min-w-0 flex-1 bg-transparent px-3 text-admin-text outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toast("Custom links are coming soon")}
                      className="flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[13px] text-admin-muted hover:bg-admin-hover"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="QR code"
                    title="QR code"
                    onClick={() => setIsQrOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-hover text-admin-muted hover:text-admin-text"
                  >
                    <QrCode aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>

                {form.has_unpublished_changes && (
                  <p className="mt-3 text-[13px] text-admin-muted">
                    You have edits that are not live yet. Respondents see the last published version until you publish
                    again.
                  </p>
                )}

                <div className="mt-6 border-t border-admin-border pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-admin-muted">Link preview</p>
                    <button
                      type="button"
                      onClick={() => toast("Customizing the link preview is coming soon")}
                      className="flex items-center gap-2 text-admin-muted hover:text-admin-text"
                    >
                      Customize
                      <ChevronDown aria-hidden="true" className="h-3 w-3 fill-current" />
                    </button>
                  </div>
                  {/* The preview is also a link, so the form can be opened from here. */}
                  <a
                    href={`/to/${form.public_id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Open the form in a new tab"
                    className="mt-3 flex items-center gap-3 rounded-xl border border-admin-border p-3 hover:bg-admin-hover"
                  >
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
                  </a>
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
            <EmbedOption label="On your website" color="#C993E0" />
            <EmbedOption label="In your email" color="#B5DAFB" />
          </div>

          <div className="mt-12 flex justify-center">
            <Button onClick={() => toast("More ways to share are coming soon")}>Explore other ways to share</Button>
          </div>

          {/* Typeform closes a form from its settings; ours has no such page, so the
              switch lives here, below everything Typeform shows. */}
          {isLive && (
            <div className="mt-12 flex items-center justify-between rounded-xl bg-white px-6 py-4">
              <span className="text-admin-muted">Stop accepting responses</span>
              <Button onClick={() => void unpublish()}>Unpublish</Button>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        title="QR code"
        description="Scan it with a phone camera to open the form."
      >
        <div className="flex justify-center pb-2 pt-4">
          <QRCodeSVG value={link} size={200} />
        </div>
      </Modal>
    </div>
  );
}

/**
 * One of the two embed cards: a coloured picture on the left, the name on the right.
 * Embedding is outside the brief, so the card only says it is coming.
 */
function EmbedOption({ label, color }: { label: string; color: string }) {
  return (
    <button
      type="button"
      onClick={() => toast(`Embedding ${label.toLowerCase()} is coming soon`)}
      className="flex h-24 overflow-hidden rounded-xl border border-admin-border bg-white text-left hover:bg-admin-hover"
    >
      <span className="flex w-36 shrink-0 items-center justify-center" style={{ backgroundColor: color }}>
        {/* A tiny drawing of a page with a form on it, standing in for Typeform's photo. */}
        <span className="flex h-[68px] w-[106px] flex-col gap-[5px] bg-white p-2">
          <span className="h-[3px] w-6 rounded-full bg-black/60" />
          <span className="flex flex-1 gap-[5px]">
            <span className="flex-1 rounded-[2px]" style={{ backgroundColor: color, opacity: 0.45 }} />
            <span className="flex-1 rounded-[2px] bg-black/10" />
          </span>
        </span>
      </span>
      <span className="p-4 text-[16px] leading-6 text-admin-text">{label}</span>
    </button>
  );
}
