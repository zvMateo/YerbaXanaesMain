import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  Leaf,
  Truck,
  Home,
  Building2,
  MessageCircle,
  Package,
} from "lucide-react";
import {
  brand,
  locationLine,
  pickupAddress,
  whatsappHref,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: "Envíos",
  description:
    "Retiro en el local o envío a domicilio y sucursal con Correo Argentino. Cotizamos en el checkout.",
  openGraph: {
    title: `Envíos | ${brand.name}`,
    description:
      "Retiro en el local o envío a domicilio y sucursal con Correo Argentino.",
  },
};

export default function EnviosPage() {
  const waHref = whatsappHref(
    "Hola, necesito cotizar el envío de mi pedido de YerbaXanaes.",
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-yerba-50 via-white to-earth-50 py-20 overflow-hidden relative">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-yerba-100/40 blur-3xl pointer-events-none"
          />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-yerba-100 text-yerba-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Leaf className="h-4 w-4" aria-hidden="true" />
                <span>A todo el país</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-4">
                Envíos
              </h1>
              <p className="text-lg text-stone-600">
                Podés retirar en {locationLine()} o recibir tu pedido por
                Correo Argentino, a domicilio o en sucursal.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
              <div className="rounded-2xl border border-stone-200 p-6">
                <div className="w-12 h-12 rounded-xl bg-yerba-100 flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-yerba-600" aria-hidden="true" />
                </div>
                <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
                  Retiro en el local
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Coordinamos el retiro en {locationLine()}. Dirección:{" "}
                  {pickupAddress()}.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 p-6">
                <div className="w-12 h-12 rounded-xl bg-yerba-100 flex items-center justify-center mb-4">
                  <Home className="h-6 w-6 text-yerba-600" aria-hidden="true" />
                </div>
                <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
                  Domicilio
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Correo Argentino entrega a domicilio (opción D). El precio
                  se cotiza en el checkout según tu código postal.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 p-6">
                <div className="w-12 h-12 rounded-xl bg-yerba-100 flex items-center justify-center mb-4">
                  <Building2
                    className="h-6 w-6 text-yerba-600"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
                  Sucursal
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Correo Argentino a sucursal (opción S). Elegís la sucursal
                  en el checkout y retirás ahí cuando llega.
                </p>
              </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Cómo se cotiza
                </h2>
                <p className="text-stone-600 leading-relaxed">
                  En el checkout pedimos tu código postal y cotizamos con
                  Correo Argentino. El costo se muestra antes de pagar. El
                  plazo lo informa el correo en esa cotización: no prometemos
                  un tiempo fijo de entrega.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Envío gratis
                </h2>
                <p className="text-stone-600 leading-relaxed">
                  En compras desde $15.000 el envío va sin cargo, según las
                  condiciones que ves en la tienda al armar el pedido.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Cobertura
                </h2>
                <p className="text-stone-600 leading-relaxed">
                  Enviamos a todo el país a través de Correo Argentino. Si la
                  cotización automática no está disponible, te ayudamos a
                  coordinar el envío.
                </p>
              </div>

              <div className="bg-yerba-50 rounded-2xl p-6 border border-yerba-100">
                <div className="flex items-start gap-3">
                  <Truck
                    className="h-5 w-5 text-yerba-600 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-2">
                      ¿No pudiste cotizar en el checkout?
                    </h3>
                    <p className="text-stone-600 text-sm leading-relaxed mb-4">
                      Escribinos y lo vemos juntos. También podés ir a{" "}
                      <Link
                        href="/contacto"
                        className="text-yerba-700 font-medium hover:underline"
                      >
                        Contacto
                      </Link>
                      .
                    </p>
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-yerba-700 transition-colors"
                      >
                        Cotizar por WhatsApp
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
