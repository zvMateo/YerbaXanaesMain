import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, Leaf } from "lucide-react";
import { HeroAnimations } from "@/components/hero-animations";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream py-20 lg:py-28 min-h-[600px] flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-muted text-shadow px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Leaf className="h-4 w-4 text-palm" aria-hidden="true" />
              <span>Yerba Mate Premium Argentina</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-shadow leading-tight mb-6">
              Descubrí el auténtico{" "}
              <span className="text-palm">sabor argentino</span>
            </h1>

            <p className="text-lg text-shadow/70 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Seleccionamos las mejores yerbas mate, mates artesanales y
              accesorios para que disfrutes de la tradición en cada sorbo.
              Calidad que se siente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/productos"
                className="inline-flex items-center justify-center gap-2 bg-palm text-white px-8 py-4 rounded-full font-semibold hover:bg-palm/90 transition-colors shadow-lg shadow-palm/20"
              >
                Ver Productos
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/nosotros"
                className="inline-flex items-center justify-center gap-2 bg-card text-shadow border-2 border-border px-8 py-4 rounded-full font-semibold hover:border-palm hover:text-palm transition-colors"
              >
                Conocenos
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-border pt-8">
              <div>
                <div className="font-serif text-3xl font-bold text-palm">
                  100%
                </div>
                <div className="text-sm text-shadow/70">Natural</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-palm">
                  AR
                </div>
                <div className="text-sm text-shadow/70">Origen Córdoba</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-palm">
                  País
                </div>
                <div className="text-sm text-shadow/70">Envíos a todo el país</div>
              </div>
            </div>
          </div>

          <HeroAnimations>
            <div className="relative aspect-square max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-border">
              <Image
                src="/brand/hero.jpg"
                alt="Yerba mate agroecológica de Yerba Xanaes"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 28rem"
              />

              <div className="absolute top-6 left-6 bg-card rounded-xl px-4 py-3 shadow-lg border border-border">
                <div className="flex items-center gap-2">
                  <Truck
                    className="h-5 w-5 text-palm flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-bold text-shadow">
                      Envío gratis
                    </p>
                    <p className="text-xs text-muted-foreground">+$15.000</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 bg-palm text-white rounded-xl px-4 py-3 shadow-lg">
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
