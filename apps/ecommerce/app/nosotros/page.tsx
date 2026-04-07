import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  Leaf,
  Heart,
  Users,
  ArrowRight,
  Package,
  Star,
  Truck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Nuestra Historia",
  description:
    "Conocé la historia detrás de YerbaXanaes. Somos una marca argentina apasionada por el mate, comprometida con la calidad y la tradición.",
  openGraph: {
    title: "Nuestra Historia | YerbaXanaes",
    description:
      "Conocé la historia detrás de YerbaXanaes. Una marca argentina apasionada por el mate.",
  },
};

const VALUES = [
  {
    icon: Star,
    title: "Calidad sin compromiso",
    description:
      "Cada producto que ofrecemos pasa por una selección rigurosa. Solo lo mejor llega a tu puerta.",
  },
  {
    icon: Heart,
    title: "Tradición con pasión",
    description:
      "El mate es mucho más que una bebida: es una forma de vida. Eso nos inspira todos los días.",
  },
  {
    icon: Users,
    title: "Cercanía real",
    description:
      "Somos un emprendimiento familiar. Conocemos a nuestros clientes y los tratamos como parte de la familia.",
  },
];

const FLOW_STEPS = [
  {
    number: "01",
    title: "Compramos al proveedor",
    description:
      "Seleccionamos bolsas de yerba de la más alta calidad directamente de productores confiables. Distintas variedades: tradicional, entre fina, con palo y más.",
  },
  {
    number: "02",
    title: "Racionamos a medida",
    description:
      "Preparamos paquetes de diferentes tamaños (500g, 1kg, 2kg, 3kg) según los pedidos. Cada bolsa se arma con cuidado para mantener la frescura.",
  },
  {
    number: "03",
    title: "Packaging premium",
    description:
      "Usamos envases diseñados para proteger la calidad y el aroma. Tu yerba llega como la pediste, en perfectas condiciones.",
  },
  {
    number: "04",
    title: "Lo llevamos a tu puerta",
    description:
      "Despachamos a todo el país con envío rápido. Seguís tu pedido en tiempo real hasta que llega a tus manos.",
  },
];

export default function NosotrosPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-yerba-50 via-white to-earth-50 py-24 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-yerba-100/50 blur-3xl pointer-events-none"
          />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-yerba-100 text-yerba-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Leaf className="h-4 w-4" aria-hidden="true" />
                <span>Un emprendimiento con alma</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-6">
                Nuestra Historia
              </h1>
              <p className="text-xl text-stone-600 leading-relaxed">
                Somos una marca argentina que nació del amor por el mate. Desde
                el primer día, nuestra misión es llevar calidad real a cada
                rincón del país.
              </p>
            </div>
          </div>
        </section>

        {/* Historia */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Placeholder imagen */}
              <div className="order-2 lg:order-1">
                <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-yerba-100 to-earth-100 border border-stone-200 flex flex-col items-center justify-center gap-4 shadow-lg">
                  <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center">
                    <Leaf className="h-12 w-12 text-yerba-500" aria-hidden="true" />
                  </div>
                  <p className="text-stone-500 text-sm">
                    Foto del equipo próximamente
                  </p>
                </div>
              </div>

              {/* Texto */}
              <div className="order-1 lg:order-2">
                <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-3">
                  Cómo empezó todo
                </p>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-6">
                  Una pasión que se convirtió en negocio
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  <p>
                    YerbaXanaes nació de una pasión genuina por el mate y por
                    compartir esa tradición argentina con más personas. Lo que
                    empezó como un proyecto personal creció gracias al apoyo de
                    nuestros clientes y a las ganas de hacer las cosas bien.
                  </p>
                  <p>
                    Trabajamos con productores de confianza, seleccionando
                    yerbas de distintas variedades y preparando cada pedido a
                    medida. No somos un depósito anónimo: cada bolsa la armamos
                    nosotros, sabiendo que hay alguien del otro lado esperándola
                    con ganas de tomar un buen mate.
                  </p>
                  <p>
                    Hoy llegamos a todo el país y seguimos creciendo, pero sin
                    perder lo que nos define: calidad, cercanía y amor por lo
                    que hacemos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Valores */}
        <section className="py-20 bg-yerba-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-2">
                Lo que nos mueve
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
                Nuestros Valores
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="bg-white rounded-2xl p-8 border border-stone-200 text-center hover:shadow-md transition-shadow"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-yerba-100 rounded-2xl mb-6">
                    <v.icon className="h-8 w-8 text-yerba-600" aria-hidden="true" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-stone-900 mb-3">
                    {v.title}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    {v.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo trabajamos */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-2">
                Nuestro proceso
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
                Del proveedor a tu puerta
              </h2>
              <p className="text-stone-600 max-w-2xl mx-auto">
                Así funciona YerbaXanaes: con honestidad, cuidado y las ganas de
                que tu yerba llegue perfecta.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {FLOW_STEPS.map((step) => (
                <div key={step.number} className="relative">
                  <div className="text-5xl font-serif font-bold text-yerba-100 mb-4 leading-none select-none">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-stone-900 text-lg mb-3">
                    {step.title}
                  </h3>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-stone-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="flex items-center gap-2 text-stone-600">
                  <Package className="h-5 w-5 text-yerba-600" aria-hidden="true" />
                  <span className="text-sm">Packaging premium</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <Truck className="h-5 w-5 text-yerba-600" aria-hidden="true" />
                  <span className="text-sm">Envío a todo el país</span>
                </div>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
                ¿Listo para probar la diferencia?
              </h2>
              <p className="text-stone-600 mb-8">
                Explorá nuestra selección de yerbas, mates artesanales y
                accesorios. Tu próximo mate favorito te está esperando.
              </p>
              <Link
                href="/productos"
                className="inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-yerba-700 transition-colors shadow-lg shadow-yerba-600/20"
              >
                Ver nuestros productos
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
