"use client";

/**
 * form-row.tsx — one form in the home page, as a list row or as a grid card.
 *
 * What it does:   shows a form's name, status, response count, completion rate and last
 *                 update, links to its builder, and offers the "..." menu (rename,
 *                 duplicate, results, copy link, delete).
 * Depends on:     ui/menu.tsx, next/link.
 * Depended on by: forms-list-screen.tsx.
 */

import { Blocks, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import type { FormListItem } from "@/lib/types";

export interface FormRowProps {
  form: FormListItem;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

/** "Oct 09, 2026", the format Typeform's list uses. */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

/** "100%", or a dash when nobody has started the form yet. */
function formatCompletion(completionRate: number | null): string {
  if (completionRate === null) {
    return "-";
  }
  return `${Math.round(completionRate)}%`;
}

/** The small Draft / Published tag. The brief asks for the status in the list. */
function StatusChip({ form }: { form: FormListItem }) {
  if (form.status === "published") {
    return (
      <span className="shrink-0 rounded-full border border-status-green/30 bg-status-green-bg px-2 py-[1px] text-[12px] leading-4 text-status-green">
        {form.has_unpublished_changes ? "Published · edits" : "Published"}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-admin-border px-2 py-[1px] text-[12px] leading-4 text-admin-muted">
      Draft
    </span>
  );
}

/** The "..." menu, shared by the row and the card. */
function FormActionsMenu({ form, onRename, onDuplicate, onDelete, onCopyLink }: FormRowProps) {
  const router = useRouter();
  return (
    <Menu
      trigger={
        <button
          type="button"
          aria-label={`Actions for ${form.title}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      }
    >
      {/* Same items, order and grouping as Typeform's form menu. */}
      <MenuItem onSelect={onCopyLink} disabled={form.status !== "published"}>
        Copy link
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => router.push(`/forms/${form.id}/create`)}>Content</MenuItem>
      <MenuItem onSelect={() => router.push(`/forms/${form.id}/workflow`)}>Workflow</MenuItem>
      <MenuItem onSelect={() => router.push(`/forms/${form.id}/share`)}>Share</MenuItem>
      <MenuItem onSelect={() => router.push(`/forms/${form.id}/results`)}>Results</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onRename}>Rename</MenuItem>
      <MenuItem onSelect={onDuplicate}>Duplicate</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onDelete} isDanger>
        Delete
      </MenuItem>
    </Menu>
  );
}

/** The coloured square that stands in for a form's thumbnail. */
function FormThumbnail({ sizeClass }: { sizeClass: string }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-lg bg-[#4B7BB5] ${sizeClass}`} />;
}

/** List view: one row. Column widths match the headings in forms-list-screen.tsx. */
export function FormRow(props: FormRowProps) {
  const { form } = props;

  return (
    <li className="flex min-h-12 items-center rounded-xl border border-admin-border bg-white p-2 hover:bg-white/60">
      <Link href={`/forms/${form.id}/create`} className="flex min-w-0 flex-1 items-center gap-3">
        <FormThumbnail sizeClass="h-8 w-8" />
        <span className="truncate font-medium text-admin-text">{form.title}</span>
        <StatusChip form={form} />
      </Link>

      <span className="w-20 text-center text-admin-text sm:w-28">{form.response_count === 0 ? "-" : form.response_count}</span>
      <span className="hidden w-28 text-center text-admin-text md:block">{formatCompletion(form.completion_rate)}</span>
      <span className="hidden w-32 text-admin-text md:block">{formatDate(form.updated_at)}</span>
      <span className="hidden w-28 lg:block">
        {/* Integrations are a placeholder in the brief; the icon mirrors Typeform's column. */}
        <span
          title="Integrations (coming soon)"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-admin-border text-admin-muted"
        >
          <Blocks aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </span>

      <span className="flex w-10 justify-end">
        <FormActionsMenu {...props} />
      </span>
    </li>
  );
}

/** Grid view: one card, laid out like Typeform's: title, response count, small icons. */
export function FormCard(props: FormRowProps) {
  const { form } = props;

  return (
    <li className="relative min-h-[148px] rounded-xl bg-white hover:shadow-[0_0_0_1px_var(--color-admin-border)]">
      <Link href={`/forms/${form.id}/create`} className="block h-full p-4 pr-12">
        <span className="block truncate text-[16px] leading-6 text-admin-text">{form.title}</span>
        {form.response_count > 0 && (
          <span className="mt-1 block text-[13px] text-admin-muted">{form.response_count} responses</span>
        )}
        <span className="mt-3 flex items-center gap-2">
          <span
            title="Integrations (coming soon)"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-admin-border text-admin-muted"
          >
            <Blocks aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <StatusChip form={form} />
        </span>
      </Link>
      {/* Outside the link, so opening the menu does not also open the form. */}
      <span className="absolute right-2 top-3">
        <FormActionsMenu {...props} />
      </span>
    </li>
  );
}
