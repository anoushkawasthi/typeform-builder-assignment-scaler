"use client";

/**
 * publish-celebration.tsx — the short animation shown when a form is first published.
 *
 * What it does:   covers the page for a moment with a tick that pops in, a ring of
 *                 dots that burst outwards, and "Your form is published". The parent
 *                 removes it (and moves on to the Share page) when it has played.
 * Depends on:     motion (animation), lucide-react (the tick).
 * Depended on by: publish-button.tsx.
 */

import { Check } from "lucide-react";
import { motion } from "motion/react";

// The colours of the dots: the pastel tile colours used for question types.
const DOT_COLORS = ["#BDDDF9", "#DDD6FA", "#F8CDD8", "#FBE19D", "#C4E3BA", "#A566BC", "#BDDDF9", "#F8CDD8"];

// How far the dots travel from the centre, in pixels.
const BURST_RADIUS = 120;

export function PublishCelebration() {
  return (
    <motion.div
      role="status"
      aria-label="Your form is published"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Dots start at the centre and fly out evenly around a circle, fading as they go.
            Each dot's direction is its share of a full turn (2π radians). */}
        {DOT_COLORS.map((color, index) => {
          const angle = (index / DOT_COLORS.length) * 2 * Math.PI;
          return (
            <motion.span
              key={index}
              className="absolute h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{
                x: Math.cos(angle) * BURST_RADIUS,
                y: Math.sin(angle) * BURST_RADIUS,
                opacity: [0, 1, 0],
                scale: 1,
              }}
              transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
            />
          );
        })}

        {/* The tick: a spring makes it overshoot slightly and settle, which reads as a "pop". */}
        <motion.span
          className="flex h-24 w-24 items-center justify-center rounded-full bg-admin-text text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
        >
          <Check aria-hidden="true" className="h-12 w-12" strokeWidth={3} />
        </motion.span>
      </div>

      <motion.p
        className="mt-8 text-[24px] leading-8 text-admin-text"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
      >
        Your form is published
      </motion.p>
      <motion.p
        className="mt-2 text-admin-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.65 }}
      >
        Taking you to the share page...
      </motion.p>
    </motion.div>
  );
}
