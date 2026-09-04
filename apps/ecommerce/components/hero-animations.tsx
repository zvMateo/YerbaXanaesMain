"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

type HeroMotionContextValue = {
  imageY: MotionValue<number>;
  reduceMotion: boolean;
};

const HeroMotionContext = createContext<HeroMotionContextValue | null>(null);

export function HeroAnimations({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 110]);

  return (
    <HeroMotionContext.Provider value={{ imageY, reduceMotion }}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </HeroMotionContext.Provider>
  );
}

export function HeroParallaxMedia({ children }: { children: ReactNode }) {
  const ctx = useContext(HeroMotionContext);
  const reduceMotion = ctx?.reduceMotion ?? false;

  return (
    <motion.div
      className="absolute inset-x-0 -top-[18%] -bottom-[18%]"
      style={reduceMotion ? undefined : { y: ctx?.imageY }}
    >
      {children}
    </motion.div>
  );
}
