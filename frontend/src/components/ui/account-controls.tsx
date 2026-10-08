"use client";

/**
 * account-controls.tsx — the help button and account avatar at the right end of every
 * creator page's header, where Typeform has them.
 *
 * What it does:   draws the two controls. There is one built-in creator and no login
 *                 (the brief allows that), so both only say what they would do.
 * Depends on:     ui/button.tsx, lucide-react, sonner.
 * Depended on by: ui/form-header.tsx, forms-list/forms-list-screen.tsx.
 */

import { CircleHelp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// Initials of the built-in creator, "Demo Creator" (backend/app/auth.py).
const CREATOR_INITIALS = "DC";

export function AccountControls() {
  return (
    <>
      <Button variant="ghost" iconOnly aria-label="Help" title="Help" onClick={() => toast("Help is coming soon")}>
        <CircleHelp aria-hidden="true" className="h-4 w-4" />
      </Button>
      <button
        type="button"
        aria-label="Account"
        title="Demo Creator"
        onClick={() => toast("Accounts and teams are coming soon")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#BDDDF9] text-[13px] font-medium text-admin-active"
      >
        {CREATOR_INITIALS}
      </button>
    </>
  );
}
