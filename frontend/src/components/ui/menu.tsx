"use client";

/**
 * menu.tsx — a small pop-up menu (the "..." menus and select-style pickers).
 *
 * What it does:   wraps Radix DropdownMenu with the admin look.
 * Depends on:     @radix-ui/react-dropdown-menu.
 * Depended on by: forms-list (row actions), builder (question actions, type picker,
 *                 rating pickers).
 */

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

interface MenuProps {
  /** The element that opens the menu when clicked. Must be a single button. */
  trigger: ReactNode;
  align?: "start" | "end";
  /** Which side of the trigger the menu opens on. Defaults to below it. */
  side?: "bottom" | "right";
  /**
   * Size and inner spacing of the pop-up. The default suits a list of actions; a picker
   * with small items (a short list of numbers, a grid of icons) passes its own.
   */
  sizeClassName?: string;
  children: ReactNode;
}

export function Menu({ trigger, align = "end", side = "bottom", sizeClassName = "min-w-[202px] p-2", children }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={side === "right" ? 12 : 4}
          // Typeform's menus have a thin border and a soft 3px ring instead of a drop shadow.
          className={`z-50 rounded-xl border border-admin-border bg-white shadow-[0_0_0_3px_var(--color-admin-ring)] ${sizeClassName}`}
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
  /** Marks the current value when the menu is used as a picker. */
  isSelected?: boolean;
  children: ReactNode;
}

export function MenuItem({ onSelect, isDanger = false, disabled = false, isSelected = false, children }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={
        "flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg pl-2 pr-3 text-[14px] outline-none " +
        "data-[highlighted]:bg-admin-hover data-[disabled]:cursor-default data-[disabled]:opacity-40 " +
        (isDanger ? "text-danger-text " : isSelected ? "text-admin-active " : "text-admin-muted ") +
        (isSelected ? "bg-admin-hover" : "")
      }
    >
      {children}
    </DropdownMenu.Item>
  );
}

interface MenuIconItemProps {
  /** What the icon means, for screen readers and as the hover tooltip. */
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/** A square, icon-only item, for a menu laid out as a grid of pictures to pick from. */
export function MenuIconItem({ label, isSelected, onSelect, children }: MenuIconItemProps) {
  return (
    <DropdownMenu.Item
      aria-label={label}
      title={label}
      onSelect={onSelect}
      className={
        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-[4px] bg-white/80 outline-none " +
        "data-[highlighted]:bg-admin-hover " +
        // The outline is drawn inside the square: thin and pale, or dark on the current one.
        (isSelected
          ? "text-admin-active shadow-[inset_0_0_0_1px_var(--color-admin-text)]"
          : "text-admin-muted shadow-[inset_0_0_0_1px_var(--color-admin-border)]")
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
