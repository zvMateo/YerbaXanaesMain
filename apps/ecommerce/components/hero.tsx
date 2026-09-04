import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import {
  HeroAnimations,
  HeroParallaxMedia,
} from "@/components/hero-animations";
import { brand } from "@/lib/brand";

const freeShippingLabel = `+$${brand.freeShippingFromArs.toLocaleString("es-AR")}`;

export function Hero() {
  return (
    <section className="relative overflow-x-clip bg-cream">
      <div className="relative z-20 mx-auto flex max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 lg:min-h-[calc(100svh-4rem)] lg:px-8 lg:py-24">
        <div className="w-full lg:w-[50%] xl:w-[46%]">
          <p className="mb-4 text-sm text-shadow/70 sm:mb-6">
            Yerba Mate Premium Argentina
          </p>

          <h1 className="mb-4 font-serif font-bold leading-[0.95] text-shadow text-[clamp(2.25rem,8vw,6rem)] sm:mb-6">
            Descubrí el
            <br />
            auténtico{" "}
            <span className="text-palm">sabor argentino</span>
          </h1>

          <p className="mb-6 max-w-md text-base leading-relaxed text-shadow/70 sm:mb-8 sm:text-lg">
            Seleccionamos las mejores yerbas mate, mates artesanales y
            accesorios para que disfrutes de la tradición en cada sorbo.
            Calidad que se siente.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/productos"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-palm px-8 py-3 font-semibold text-white transition-colors hover:bg-palm/90"
            >
              Ver Productos
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/nosotros"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-shadow/25 bg-transparent px-8 py-3 font-semibold text-shadow transition-colors hover:border-palm hover:text-palm"
            >
              Conocenos
            </Link>
          </div>

          <p className="mt-8 max-w-lg text-sm leading-7 text-shadow/70 sm:mt-12">
            <span className="font-serif text-xl text-palm">100%</span> Natural
            · Sin conservantes
            <span className="mx-3 text-palm/50" aria-hidden="true">
              ·
            </span>
            Origen {brand.region}
            <span className="mx-3 text-palm/50" aria-hidden="true">
              ·
            </span>
            <Link href="/envios" className="underline-offset-2 hover:underline">
              Envíos a todo el país
            </Link>
            <span className="mx-3 text-palm/50" aria-hidden="true">
              ·
            </span>
            Envío gratis {freeShippingLabel}
          </p>
        </div>
      </div>

      <HeroAnimations className="relative z-10 h-[min(58vw,18rem)] w-full overflow-hidden sm:h-[min(70vw,28rem)] lg:absolute lg:inset-y-0 lg:left-[46vw] lg:right-0 lg:h-auto">
        <HeroParallaxMedia>
          <Image
            src="/brand/hero.jpg"
            alt="Yerba mate agroecológica de Yerba Xanaes"
            fill
            priority
            className="object-cover object-[center_30%]"
            sizes="(max-width: 1024px) 100vw, 54vw"
          />
        </HeroParallaxMedia>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-cream via-cream/50 to-transparent lg:block"
        />
      </HeroAnimations>
    </section>
  );
}
