"use client";

/**
 * canvas-frame.tsx — the "screen" in the middle of the builder.
 *
 * What it does:   draws a 16:9 frame as wide as the centre column and shows the form
 *                 inside it exactly as a respondent's desktop browser would, shrunk to
 *                 fit when the frame is narrower than a desktop window.
 * Depends on:     respondent/form-theme.tsx (the form's colours and font).
 * Depended on by: question-canvas.tsx, welcome-canvas.tsx; choice-editor.tsx reads the
 *                 scale from `CanvasScaleContext`.
 *
 * How the shrinking works, as measured on Typeform: the content is laid out for a
 * screen at least 1024px wide and then scaled by (frame width / that width). So on a
 * 1440px laptop the frame is 840px and everything is drawn at 82%; on a large monitor
 * the frame is wider than 1024px and nothing is scaled at all.
 */

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";

import { FormTheme } from "@/components/respondent/form-theme";
import type { Theme } from "@/lib/types";

// The narrowest "desktop" the content is ever laid out for.
const DESIGN_WIDTH = 1024;

/** How much the canvas content is scaled: 1 is full size, 0.82 is 82%. */
export const CanvasScaleContext = createContext(1);

interface CanvasFrameProps {
  theme: Theme;
  children: ReactNode;
}

export function CanvasFrame({ theme, children }: CanvasFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  // 0 until the frame has been measured; nothing is drawn inside it before that.
  const [frameWidth, setFrameWidth] = useState(0);

  // Keep `frameWidth` equal to the frame's inner width, also when the window is resized.
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => setFrameWidth(entries[0].contentRect.width));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const designWidth = Math.max(DESIGN_WIDTH, frameWidth);
  const scale = frameWidth === 0 ? 1 : frameWidth / designWidth;

  return (
    <div ref={frameRef} className="mx-3 aspect-video shrink-0 overflow-hidden border border-admin-border-soft">
      <FormTheme theme={theme} className="h-full w-full">
        {frameWidth > 0 && (
          // The full-size "screen". `zoom` scales it, and the space it takes up, together.
          <div style={{ width: designWidth, height: (designWidth * 9) / 16, zoom: scale }}>
            {/* `@container` makes the form's own responsive rules see this screen's
                width (always 1024px or more), so the canvas shows the desktop layout
                however small the frame is drawn. */}
            <div className="@container grid h-full w-full overflow-y-auto">
              <div className="mx-auto w-full max-w-[880px] self-center px-20 py-6">
                <CanvasScaleContext.Provider value={scale}>{children}</CanvasScaleContext.Provider>
              </div>
            </div>
          </div>
        )}
      </FormTheme>
    </div>
  );
}
