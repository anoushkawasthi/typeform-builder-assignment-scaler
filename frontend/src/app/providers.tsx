"use client";

/**
 * providers.tsx — app-wide helpers that need to run in the browser.
 *
 * What it does:   creates the TanStack Query client (caches API data and refetches it)
 *                 and mounts the toast container.
 * Depends on:     @tanstack/react-query, sonner.
 * Depended on by: app/layout.tsx.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState (not a module-level constant) so each browser tab gets its own client and
  // nothing is shared between visitors when the page is rendered on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Avoid a refetch every time the window regains focus; the builder holds
            // unsaved keystrokes that a surprise refetch could overwrite.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          // Dark pill with white text, matching Typeform's notifications.
          style: {
            background: "#3c323e",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
