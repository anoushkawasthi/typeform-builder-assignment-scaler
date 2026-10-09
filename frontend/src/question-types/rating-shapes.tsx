/**
 * rating-shapes.tsx — the pictures a rating question can be drawn with.
 *
 * What it does:   holds the seventeen shapes Typeform offers (stars, hearts, ...) with
 *                 the icon for each, and draws one of them outlined or filled in.
 * Depends on:     lucide-react (icons), lib/types.ts.
 * Depended on by: rating-answer.tsx (the form) and
 *                 components/builder/question-settings.tsx (the shape picker).
 */

import {
  Cat,
  Circle,
  CircleCheck,
  Cloud,
  Crown,
  Dog,
  Droplet,
  Flag,
  Heart,
  Lightbulb,
  type LucideIcon,
  Pencil,
  Skull,
  Smile,
  Star,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react";

import type { RatingShape } from "@/lib/types";

interface RatingShapeInfo {
  /** Typeform's name for the shape, read out by screen readers in the picker. */
  label: string;
  icon: LucideIcon;
}

// Keyed by the value stored on the question. The order is the order of Typeform's picker.
export const RATING_SHAPES: Record<RatingShape, RatingShapeInfo> = {
  star: { label: "Stars", icon: Star },
  heart: { label: "Hearts", icon: Heart },
  user: { label: "Users", icon: Smile },
  thumbs_up: { label: "Thumbs Up", icon: ThumbsUp },
  crown: { label: "Crowns", icon: Crown },
  cat: { label: "Cats", icon: Cat },
  dog: { label: "Dogs", icon: Dog },
  circle: { label: "Circles", icon: Circle },
  flag: { label: "Flags", icon: Flag },
  droplet: { label: "Droplets", icon: Droplet },
  tick: { label: "Ticks", icon: CircleCheck },
  lightbulb: { label: "Lightbulbs", icon: Lightbulb },
  trophy: { label: "Trophies", icon: Trophy },
  cloud: { label: "Clouds", icon: Cloud },
  thunderbolt: { label: "Thunderbolts", icon: Zap },
  pencil: { label: "Pencils", icon: Pencil },
  skull: { label: "Skulls", icon: Skull },
};

// A five-pointed star drawn in a 56x56 box. The star keeps its own drawing because it
// is the default and was matched to Typeform's; the other shapes use the icon set.
const STAR_PATH =
  "M28 4.5l7.1 17.4 18.7 1.5-14.2 12.2 4.4 18.3L28 44.1 12 53.9l4.4-18.3L2.2 23.4l18.7-1.5L28 4.5z";

interface RatingShapeIconProps {
  shape: RatingShape;
  /** Filled in (picked or hovered) or only outlined. */
  isFilled: boolean;
}

/** One shape at the size the form draws ratings: 40px on phones, 56px on wide screens. */
export function RatingShapeIcon({ shape, isFilled }: RatingShapeIconProps) {
  const sizeClasses = "h-10 w-10 @2xl:h-14 @2xl:w-14";
  const colourClasses =
    "transition-[fill,stroke] duration-200 ease-form " +
    (isFilled ? "fill-form-answer-30 stroke-form-answer" : "fill-transparent stroke-form-answer-60");

  // A shape this version of the page does not know is drawn as the default, the star.
  const info = RATING_SHAPES[shape];
  if (shape === "star" || info === undefined) {
    return (
      <svg viewBox="0 0 56 56" className={sizeClasses} aria-hidden="true">
        <path d={STAR_PATH} strokeWidth="2.5" strokeLinejoin="round" className={colourClasses} />
      </svg>
    );
  }

  const Icon = info.icon;
  // The icons are drawn in a 24px box, so a 1.1 stroke comes out about as thick as the
  // star's outline once the icon is enlarged to 56px.
  return <Icon aria-hidden="true" strokeWidth={1.1} className={`${sizeClasses} ${colourClasses}`} />;
}
