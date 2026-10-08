"use client";

/**
 * export-dialog.tsx — choosing a file format before downloading responses.
 *
 * What it does:   asks ".csv or .xlsx?" and starts the download, like Typeform's export
 *                 dialog.
 * Depends on:     ui/modal.tsx, ui/button.tsx, lib/api.ts.
 * Depended on by: responses-tab.tsx.
 *
 * The file itself is built by the server (backend/app/services/export.py). This dialog
 * only picks the address to download from.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal, ModalActions } from "@/components/ui/modal";
import { responsesExportUrl, type ExportFormat } from "@/lib/api";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formId: number;
  /** The ticked responses. Empty means "export every response". */
  responseIds: number[];
  /** How many responses the file will hold, for the dialog's title. */
  responseCount: number;
}

const FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv", label: ".csv", description: "Plain text data for databases or advanced analysis." },
  { value: "xlsx", label: ".xlsx", description: "Works with Excel." },
];

export function ExportDialog({ isOpen, onClose, formId, responseIds, responseCount }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");

  function startDownload() {
    // The server answers with a "download this" header, so going to the address saves
    // the file and leaves this page where it is.
    window.location.assign(responsesExportUrl(formId, format, responseIds));
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export ${responseCount} ${responseCount === 1 ? "response" : "responses"}`}
    >
      <fieldset className="mt-9">
        <legend className="text-[16px] leading-6 text-admin-text">Choose your format:</legend>
        <div className="mt-5 flex flex-col gap-3">
          {FORMATS.map((option) => (
            <label key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="export-format"
                value={option.value}
                checked={format === option.value}
                onChange={() => setFormat(option.value)}
                // A plain circle; when picked, a thick dark border leaves a white dot in
                // the middle, which is how Typeform draws its radio buttons.
                className="h-5 w-5 shrink-0 appearance-none rounded-full border border-admin-muted/60 bg-white checked:border-[6px] checked:border-admin-text"
              />
              <span>
                <span className="block text-admin-text">{option.label}</span>
                <span className="mt-1 block text-[12px] leading-4 text-admin-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={startDownload}>
          Export
        </Button>
      </ModalActions>
    </Modal>
  );
}
