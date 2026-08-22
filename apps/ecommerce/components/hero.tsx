import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, Leaf } from "lucide-react";
import { HeroAnimations } from "@/components/hero-animations";
import { brand } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-yerba-50 via-white to-earth-50 py-20 lg:py-28 min-h-[600px] flex items-center">
      {/* Decorative background circles */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-yerba-100/50 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-earth-100/60 blur-3xl pointer-events-none"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content — server-rendered for best LCP */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-yerba-100 text-yerba-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Leaf className="h-4 w-4" aria-hidden="true" />
              <span>Yerba Mate Premium Argentina</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-tight mb-6">
              Descubrí el auténtico{" "}
              <span className="text-yerba-600">sabor argentino</span>
            </h1>

            <p className="text-lg text-stone-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Seleccionamos las mejores yerbas mate, mates artesanales y
              accesorios para que disfrutes de la tradición en cada sorbo.
              Calidad que se siente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/productos"
                className="inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-yerba-700 transition-colors shadow-lg shadow-yerba-600/20"
              >
                Ver Productos
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/nosotros"
                className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-200 px-8 py-4 rounded-full font-semibold hover:border-yerba-600 hover:text-yerba-600 transition-colors"
              >
                Conocenos
              </Link>
            </div>

            {/* Stats — solo hechos verificables, sin cifras inventadas */}
            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-stone-200 pt-8">
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  100%
                </div>
                <div className="text-sm text-stone-600">Natural</div>
              </div>
              <div>
                <div className="font-serif text-xl sm:text-2xl font-bold text-yerba-600 leading-tight">
                  {brand.province}
                </div>
                <div className="text-sm text-stone-600">{brand.city}</div>
              </div>
              <div>
                <div className="font-serif text-xl sm:text-2xl font-bold text-yerba-600 leading-tight">
                  Todo el país
                </div>
                <div className="text-sm text-stone-600">Envíos</div>
              </div>
            </div>
          </div>

          {/* Visual — foto real de yerba agroecológica */}
          <HeroAnimations>
            <div className="relative aspect-square max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-stone-200">
              <Image
                src="/brand/hero.jpg"
                alt="Yerba mate agroecológica de Yerba Xanaes, palta recién servida"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 28rem"
              />

              {/* Floating badge: envío gratis */}
              <div className="absolute top-6 left-6 bg-white rounded-xl px-4 py-3 shadow-lg border border-stone-100">
                <div className="flex items-center gap-2">
                  <Truck
                    className="h-5 w-5 text-yerba-600 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-bold text-stone-900">
                      Envío gratis
                    </p>
                    <p className="text-xs text-stone-500">+$15.000</p>
                  </div>
                </div>
              </div>

              {/* Floating badge: natural */}
              <div className="absolute bottom-6 right-6 bg-yerba-600 text-white rounded-xl px-4 py-3 shadow-lg">
                <p className="text-sm font-bold">100% Natural</p>
                <p className="text-xs opacity-85">Sin conservantes</p>
              </div>
            </div>
          </HeroAnimations>
        </div>
      </div>
    </section>
  );
}
