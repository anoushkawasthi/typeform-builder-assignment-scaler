/**
 * formatted-text.tsx — bold and italic inside titles, descriptions and choice labels.
 *
 * What it does:   text is stored with simple markers: **bold** and *italic*. This file
 *                 splits such text into pieces, draws it with real bold and italic
 *                 (`FormattedText`), removes the markers where plain text is needed
 *                 (`stripFormatting`), and adds or removes markers around a selection
 *                 (`toggleMarker`, used by the builder's B / I buttons).
 * Depends on:     nothing.
 * Depended on by: respondent/question-screen.tsx, question-types (choice labels),
 *                 ui/autosave-text.tsx, and the builder and results components that
 *                 show titles.
 *
 * Why markers instead of HTML: the stored value stays plain text. Nothing a creator
 * types can ever be run as code on the public form, and there is no HTML to clean.
 * The backend has the same stripping rule in app/services/text.py.
 */

import type { ReactNode } from "react";

// One formatted run: either **something** or *something*, with no asterisks inside.
// Bold is listed first so "**x**" is not read as italic around "*x*".
const MARKED_RUN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

interface TextPiece {
  text: string;
  isBold: boolean;
  isItalic: boolean;
}

/** Split text into plain, bold and italic pieces. */
export function parseFormattedText(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];

  // split() with a capturing group keeps the matched runs in the result, so the array
  // alternates between plain text and marked runs.
  for (const part of text.split(MARKED_RUN)) {
    if (part === "") {
      continue;
    }
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      pieces.push({ text: part.slice(2, -2), isBold: true, isItalic: false });
    } else if (part.length > 2 && part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      pieces.push({ text: part.slice(1, -1), isBold: false, isItalic: true });
    } else {
      pieces.push({ text: part, isBold: false, isItalic: false });
    }
  }
  return pieces;
}

/** The text with its markers removed, for menus, table headings and anywhere plain. */
export function stripFormatting(text: string): string {
  return parseFormattedText(text)
    .map((piece) => piece.text)
    .join("");
}

/** Draw text with its bold and italic pieces as real <strong> and <em> elements. */
export function FormattedText({ text }: { text: string }): ReactNode {
  return parseFormattedText(text).map((piece, index) => {
    if (piece.isBold) {
      return <strong key={index}>{piece.text}</strong>;
    }
    if (piece.isItalic) {
      return <em key={index}>{piece.text}</em>;
    }
    return <span key={index}>{piece.text}</span>;
  });
}

/**
 * Add `marker` ("**" or "*") around the selected part of `text`, or remove it if the
 * selection is already wrapped. Returns the new text and where the selection should be
 * afterwards, so the same words stay selected.
 */
export function toggleMarker(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  marker: "**" | "*",
): { text: string; selectionStart: number; selectionEnd: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);
  const size = marker.length;

  // For italic, a single "*" that is really half of a bold "**" must not count.
  const isWrapped =
    before.endsWith(marker) &&
    after.startsWith(marker) &&
    (marker === "**" || (!before.endsWith("**") && !after.startsWith("**")));

  if (isWrapped) {
    return {
      text: before.slice(0, -size) + selected + after.slice(size),
      selectionStart: selectionStart - size,
      selectionEnd: selectionEnd - size,
    };
  }
  return {
    text: before + marker + selected + marker + after,
    selectionStart: selectionStart + size,
    selectionEnd: selectionEnd + size,
  };
}
