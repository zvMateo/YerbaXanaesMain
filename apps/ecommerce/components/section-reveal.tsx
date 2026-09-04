"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

const revealEase = [0.22, 1, 0.36, 1] as const;

export type RevealVariant = "rise" | "fade" | "slide" | "soft";

function offsetFor(variant: RevealVariant) {
  switch (variant) {
    case "rise":
      return { y: 28 };
    case "fade":
      return { y: 16 };
    case "slide":
      return { x: 36 };
    case "soft":
      return { y: 10 };
  }
}

function transitionFor(variant: RevealVariant, index: number) {
  switch (variant) {
    case "rise":
      return { duration: 0.55, delay: index * 0.08, ease: revealEase };
    case "fade":
      return { duration: 0.7, delay: index * 0.04, ease: revealEase };
    case "slide":
      return { duration: 0.6, delay: index * 0.06, ease: revealEase };
    case "soft":
      return { duration: 0.4, ease: revealEase };
  }
}

function useRevealMotion(amount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  const allowMotion = useReducedMotion() === false;
  const visible = !allowMotion || inView;
  return { ref, allowMotion, visible };
}

export function SectionReveal({
  children,
  className,
  variant = "rise",
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
}) {
  const { ref, allowMotion, visible } = useRevealMotion(0.15);
  const offset = offsetFor(variant);

  return (
    <motion.div
      ref={ref}
      data-home-reveal
      className={`home-reveal ${className ?? ""}`.trim()}
      initial={false}
      animate={visible ? { x: 0, y: 0 } : offset}
      transition={allowMotion ? transitionFor(variant, 0) : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  index = 0,
  variant = "rise",
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  variant?: RevealVariant;
}) {
  const { ref, allowMotion, visible } = useRevealMotion(0.12);
  const offset = offsetFor(variant);

  return (
    <motion.div
      ref={ref}
      data-home-reveal
      className={`home-reveal ${className ?? ""}`.trim()}
      initial={false}
      animate={visible ? { x: 0, y: 0 } : offset}
      transition={allowMotion ? transitionFor(variant, index) : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}
