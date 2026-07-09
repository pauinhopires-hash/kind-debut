// Shared motion presets — keeps timing/easing consistent across screens.
// Premium feel = restrained timing, transform+opacity only, no layout thrash.

import type { Transition, Variants } from "framer-motion";

// Apple/Linear-style easing — fast in, soft settle.
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOutSoft = [0.65, 0, 0.35, 1] as const;

export const springSoft: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.6,
};

export const tap = { scale: 0.97 } as const;
export const hoverLift = { y: -2 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOutExpo } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: easeOutExpo } },
};

// Route-level transition — quicker/subtler than fadeUp, so page swaps stay snappy.
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOutExpo } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: easeInOutSoft } },
};

export const staggerList = (stagger = 0.05, delay = 0.04): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.18, ease: easeInOutSoft } },
};

export const collapseY: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      height: { duration: 0.32, ease: easeOutExpo },
      opacity: { duration: 0.25, ease: easeOutExpo, delay: 0.05 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.24, ease: easeInOutSoft, delay: 0.05 },
      opacity: { duration: 0.15, ease: easeInOutSoft },
    },
  },
};
