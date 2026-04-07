import Link from "next/link";
import { ArrowRight, Truck, Leaf, Star } from "lucide-react";
import { HeroAnimations } from "@/components/hero-animations";

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

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-stone-200 pt-8">
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  100%
                </div>
                <div className="text-sm text-stone-600">Natural</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  500+
                </div>
                <div className="text-sm text-stone-600">Clientes</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  24h
                </div>
                <div className="text-sm text-stone-600">Envío</div>
              </div>
            </div>
          </div>

          {/* Visual — product showcase placeholder */}
          <HeroAnimations>
            {/* Main card */}
            <div className="aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-br from-yerba-100 via-white to-earth-100 border border-stone-200 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden p-8">
              {/* Decorative leaf pattern background */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='3' fill='%234a7c3d'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Central visual — space ready for real product photo */}
              <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yerba-200 to-yerba-400 flex items-center justify-center shadow-xl">
                  <Leaf className="h-16 w-16 text-white" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-serif text-xl font-bold text-stone-800">
                    Yerba Premium
                  </p>
                  <p className="text-stone-500 text-sm">
                    Directa del productor
                  </p>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="h-4 w-4 text-earth-500 fill-earth-500"
                      aria-hidden="true"
                    />
                  ))}
                  <span className="text-stone-600 text-sm ml-1">5.0</span>
                </div>
              </div>

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
