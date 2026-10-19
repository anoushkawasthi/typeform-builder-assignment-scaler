/**
 * layout.tsx — the shell wrapped around every page.
 *
 * What it does:   loads the Inter font, sets the page title, and wraps the app in
 *                 `Providers` (data fetching + toasts).
 * Depends on:     app/providers.tsx, app/globals.css.
 * Depended on by: Next.js (every route renders inside it).
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

// Inter is the font of Typeform's default form theme. next/font downloads it at build
// time and serves it from our own domain, exposed as the CSS variable --font-inter.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Typeform Replica",
  description: "A Typeform-style form builder: build, publish, collect and review responses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions (Grammarly, ColorZilla, Dark Reader…) add attributes to <html>
    // and <body> before React loads. suppressHydrationWarning ignores attribute
    // differences on these two tags only; their children are still checked.
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
