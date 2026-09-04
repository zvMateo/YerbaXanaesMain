"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { brand } from "@/lib/brand";

const street = brand.locationLabel.split(",")[0];

export function OriginStrip() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const wordX = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const packY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      ref={ref}
      className="relative overflow-x-clip bg-palm text-cream"
      aria-label={`Origen: ${brand.city}, ${brand.region}`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
        <motion.p
          aria-hidden="true"
          style={reduceMotion ? undefined : { x: wordX }}
          className="home-reveal select-none whitespace-nowrap font-serif font-bold leading-none text-cream/15 text-[clamp(3.25rem,16vw,14rem)] pl-[4vw]"
        >
          {brand.region}
        </motion.p>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="font-serif text-[clamp(1.75rem,6vw,3.5rem)] font-bold leading-[1.05] text-cream">
            {brand.city}
          </p>
          <p className="mt-4 text-base text-cream leading-relaxed sm:text-lg">
            Retiro en {street}
          </p>
          <p className="mt-1 text-sm text-cream/80 sm:text-base">
            {brand.city}, {brand.region}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <Link
              href="/envios"
              className="inline-flex min-h-11 items-center font-semibold text-cream underline-offset-4 hover:underline"
            >
              Envíos y retiro
            </Link>
            <Link
              href="/nosotros"
              className="inline-flex min-h-11 items-center font-semibold text-cream underline-offset-4 hover:underline"
            >
              Conocenos
            </Link>
            <Link
              href="/contacto"
              className="inline-flex min-h-11 items-center font-semibold text-cream underline-offset-4 hover:underline"
            >
              Contacto
            </Link>
          </div>
        </div>

        <motion.div
          aria-hidden="true"
          style={reduceMotion ? undefined : { y: packY }}
          className="relative hidden h-44 w-36 overflow-hidden lg:block"
        >
          <Image
            src="/brand/hero.jpg"
            alt=""
            fill
            className="object-cover object-[70%_40%]"
            sizes="9rem"
          />
        </motion.div>
      </div>
    </section>
  );
}
