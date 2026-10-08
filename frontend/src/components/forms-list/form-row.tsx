"use client";

/**
 * form-row.tsx — one form in the home page list.
 *
 * What it does:   shows a form's name, status, counts and last update, links to its
 *                 builder, and offers the "..." menu (rename, duplicate, results, copy
 *                 link, delete).
 * Depends on:     ui/menu.tsx, next/link.
 * Depended on by: forms-list-screen.tsx.
 */

import { BarChart3, Copy, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Menu, MenuItem } from "@/components/ui/menu";
import type { FormListItem } from "@/lib/types";

interface FormRowProps {
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

export function FormRow({ form, onRename, onDuplicate, onDelete, onCopyLink }: FormRowProps) {
  const router = useRouter();
  const isPublished = form.status === "published";

  return (
    <li className="flex min-h-12 flex-wrap items-center gap-y-1 rounded-xl border border-admin-border-soft bg-white p-2 hover:border-admin-border">
      <Link href={`/forms/${form.id}/create`} className="flex min-w-0 flex-1 items-center gap-3">
        <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-lg bg-[#DDD6FA]" />
        <span className="truncate font-medium text-admin-text">{form.title}</span>
      </Link>

      <span className="w-28">
        {isPublished ? (
          <span className="rounded-full border border-status-green/30 bg-status-green-bg px-2 py-[2px] text-[12px] text-status-green">
            {form.has_unpublished_changes ? "Published · edits" : "Published"}
          </span>
        ) : (
          <span className="rounded-full border border-admin-border px-2 py-[2px] text-[12px] text-admin-muted">Draft</span>
        )}
      </span>
      <span className="hidden w-24 text-right text-admin-text md:block">{form.question_count}</span>
      <span className="w-24 text-right text-admin-text">
        {form.response_count}
        <span className="text-admin-muted md:hidden"> responses</span>
      </span>
      <span className="hidden w-32 text-right text-admin-text md:block">{formatDate(form.updated_at)}</span>

      <span className="flex w-12 justify-end">
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
          <MenuItem onSelect={onRename}>
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Rename
          </MenuItem>
          <MenuItem onSelect={onDuplicate}>
            <Copy aria-hidden="true" className="h-4 w-4" />
            Duplicate
          </MenuItem>
          <MenuItem onSelect={() => router.push(`/forms/${form.id}/results`)}>
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
            Results
          </MenuItem>
          <MenuItem onSelect={onCopyLink} disabled={!isPublished}>
            <Link2 aria-hidden="true" className="h-4 w-4" />
            Copy link
          </MenuItem>
          <MenuItem onSelect={onDelete} isDanger>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </MenuItem>
        </Menu>
      </span>
    </li>
  );
}
