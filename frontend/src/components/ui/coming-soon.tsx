/**
 * coming-soon.tsx — placeholders for features the brief lists as "Coming Soon".
 *
 * What it does:   `ComingSoonBadge` is a small tag; `ComingSoonPanel` is a full
 *                 empty-state block for a whole page or tab.
 * Depends on:     lucide-react.
 * Depended on by: builder (Workflow and Connect tabs, Logic panel, add dialog),
 *                 forms-list (Invite).
 */

import type { LucideIcon } from "lucide-react";

/** `isShort` says just "Soon", for places too narrow for the two words. */
export function ComingSoonBadge({ isShort = false }: { isShort?: boolean }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full border border-admin-border px-2 py-[1px] text-[11px] font-normal leading-4 text-admin-muted">
      {isShort ? "Soon" : "Coming soon"}
    </span>
  );
}

interface ComingSoonPanelProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

export function ComingSoonPanel({ icon: Icon, title, text }: ComingSoonPanelProps) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-xl bg-admin-panel p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDD6FA] text-admin-text">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-[21px] leading-7 text-admin-text">{title}</h2>
      <p className="mt-2 max-w-[420px] text-admin-muted">{text}</p>
      <div className="mt-4">
        <ComingSoonBadge />
      </div>
    </div>
  );
}
