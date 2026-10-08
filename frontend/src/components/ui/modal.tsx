"use client";

/**
 * modal.tsx — a centred dialog.
 *
 * What it does:   wraps Radix Dialog with the admin look (rounded panel, soft ring,
 *                 dimmed backdrop, title, close button).
 * Depends on:     @radix-ui/react-dialog.
 * Depended on by: every dialog in the app (rename, delete, publish, share, settings...).
 *
 * Why Radix: a correct modal has to trap keyboard focus, close on Escape, restore focus
 * afterwards and hide the page from screen readers. Radix handles all of that and ships
 * no styles of its own, so the look is entirely ours. (Typeform's own UI uses Radix too.)
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional line under the title; also read out by screen readers. */
  description?: string;
  /** Tailwind max-width class. Defaults to a small dialog. */
  widthClass?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, description, widthClass = "max-w-[440px]", children }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(60,50,62,0.55)]" />
        <Dialog.Content
          // Radix warns if there is no description; undefined tells it that is intended.
          aria-describedby={description === undefined ? undefined : "modal-description"}
          className={
            "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 " +
            "overflow-y-auto rounded-2xl bg-admin-panel p-6 shadow-[0_0_0_3px_var(--color-admin-ring)] " +
            widthClass
          }
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[18px] font-medium leading-6 text-admin-text">{title}</Dialog.Title>
              {description !== undefined && (
                <Dialog.Description id="modal-description" className="mt-1 text-admin-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The row of buttons at the bottom of a modal, right-aligned. */
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
