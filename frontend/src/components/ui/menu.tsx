"use client";

/**
 * menu.tsx — a small pop-up menu (the "..." menus and select-style pickers).
 *
 * What it does:   wraps Radix DropdownMenu with the admin look.
 * Depends on:     @radix-ui/react-dropdown-menu.
 * Depended on by: forms-list (row actions), builder (question actions, type picker).
 */

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

interface MenuProps {
  /** The element that opens the menu when clicked. Must be a single button. */
  trigger: ReactNode;
  align?: "start" | "end";
  children: ReactNode;
}

export function Menu({ trigger, align = "end", children }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          // Typeform's menus have a thin border and a soft 3px ring instead of a drop shadow.
          className="z-50 min-w-[202px] rounded-xl border border-admin-border bg-white p-2 shadow-[0_0_0_3px_var(--color-admin-ring)]"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface MenuItemProps {
  onSelect: () => void;
  /** Red text, for destructive actions. */
  isDanger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function MenuItem({ onSelect, isDanger = false, disabled = false, children }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={
        "flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg pl-2 pr-3 text-[14px] outline-none " +
        "data-[highlighted]:bg-admin-hover data-[disabled]:cursor-default data-[disabled]:opacity-40 " +
        (isDanger ? "text-danger-text" : "text-admin-muted")
      }
    >
      {children}
    </DropdownMenu.Item>
  );
}

/** A thin line between groups of menu items. */
export function MenuSeparator() {
  return <DropdownMenu.Separator className="mx-2 my-2 h-px bg-admin-border" />;
}
