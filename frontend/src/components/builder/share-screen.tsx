"use client";

/**
 * share-screen.tsx — the Share tab of a form.
 *
 * What it does:   shows the public link with Copy and Open buttons when the form is
 *                 published, a Publish prompt when it is not, an Unpublish action, and
 *                 "Coming soon" tiles for the other ways of sharing.
 * Depends on:     use-form-editor.ts, publish-button.tsx, ui/form-header.tsx,
 *                 ui/button.tsx, ui/coming-soon.tsx.
 * Depended on by: app/forms/[id]/share/page.tsx.
 */

import { Code, Copy, ExternalLink, Mail, Users } from "lucide-react";
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

      <main className="mx-4 mb-4 flex-1 rounded-xl bg-admin-panel p-8">
        <div className="mx-auto max-w-[720px]">
          <h1 className="text-[24px] leading-8 text-admin-text">Share your form</h1>

          <section className="mt-6 rounded-xl bg-white p-6">
            {isLive ? (
              <>
                <h2 className="font-medium text-admin-text">Share the link</h2>
                <p className="mt-1 text-admin-muted">Anyone with this link can fill in the form. No login needed.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    readOnly
                    value={link}
                    aria-label="Public link"
                    onFocus={(event) => event.target.select()}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-admin-border bg-admin-panel px-3 text-admin-text outline-none"
                  />
                  <Button variant="primary" onClick={() => void copyLink()}>
                    <Copy aria-hidden="true" className="h-4 w-4" />
                    Copy link
                  </Button>
                  <Link
                    href={`/to/${form.public_id}`}
                    target="_blank"
                    className="flex h-8 items-center gap-2 rounded-lg border border-admin-border px-3 font-medium text-admin-muted hover:bg-admin-hover"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    Open
                  </Link>
                </div>
                {form.has_unpublished_changes && (
                  <p className="mt-3 text-[13px] text-admin-muted">
                    You have edits that are not live yet. Respondents see the last published version until you publish
                    again.
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between border-t border-admin-border-soft pt-4">
                  <span className="text-admin-muted">Stop accepting responses</span>
                  <Button onClick={() => void unpublish()}>Unpublish</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-medium text-admin-text">This form is a draft</h2>
                <p className="mt-1 text-admin-muted">
                  {form.questions.length === 0
                    ? "Add at least one question, then publish to get a shareable link."
                    : "Publish it to get a link you can share."}
                </p>
                <div className="mt-4">
                  <PublishButton form={form} editor={editor} />
                </div>
              </>
            )}
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Code, label: "Embed on a website" },
              { icon: Mail, label: "Send in an email" },
              { icon: Users, label: "Invite collaborators" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-4 text-admin-muted">
                <item.icon aria-hidden="true" className="h-5 w-5" />
                <p className="mb-2 mt-2">{item.label}</p>
                <ComingSoonBadge />
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
