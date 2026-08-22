import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Leaf } from "lucide-react";
import {
  brand,
  locationLineWithPostal,
  mailtoHref,
  whatsappHref,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Condiciones de uso de la tienda online de ${brand.name}.`,
};

export default function TerminosPage() {
  const waHref = whatsappHref();

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
                <span>Uso de la tienda</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-4">
                Términos y condiciones
              </h1>
              <p className="text-lg text-stone-600">
                Condiciones operativas de la tienda de {brand.name}.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-10 text-stone-600 leading-relaxed">
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Quiénes somos
                </h2>
                <p>
                  {brand.name} es un emprendimiento de yerba mate con sede en{" "}
                  {locationLineWithPostal()}, Argentina. El sitio{" "}
                  <a
                    href={brand.siteUrl}
                    className="text-yerba-700 hover:underline"
                  >
                    {brand.siteUrl.replace(/^https?:\/\//, "")}
                  </a>{" "}
                  es la tienda online para pedidos de productos publicados en
                  el catálogo.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Pedidos
                </h2>
                <p>
                  Podés comprar como invitado, sin crear una cuenta. El
                  pedido se confirma cuando el pago resulta aprobado. Los
                  precios y el stock son los que muestra la tienda al
                  momento de pagar.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Pagos
                </h2>
                <p>
                  El pago se procesa con Mercado Pago (Payment Brick) en el
                  checkout. {brand.name} no almacena los datos de tu tarjeta:
                  esa información la gestiona Mercado Pago.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Envíos y retiro
                </h2>
                <p>
                  Enviamos a todo el país con Correo Argentino, a domicilio
                  o a sucursal. También podés retirar en el local. El costo
                  y los plazos de correo se cotizan en el checkout. El
                  detalle está en{" "}
                  <Link
                    href="/envios"
                    className="text-yerba-700 font-medium hover:underline"
                  >
                    Envíos
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Datos que necesitamos
                </h2>
                <p>
                  Pedimos nombre, email, teléfono y, si corresponde, datos
                  de envío para cumplir el pedido. El uso de esos datos está
                  descripto en la{" "}
                  <Link
                    href="/privacidad"
                    className="text-yerba-700 font-medium hover:underline"
                  >
                    Política de Privacidad
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Contacto
                </h2>
                <p>
                  Para consultas sobre un pedido o estos términos:{" "}
                  <a
                    href={mailtoHref()}
                    className="text-yerba-700 hover:underline"
                  >
                    {brand.email}
                  </a>
                  {waHref ? (
                    <>
                      {" "}
                      o{" "}
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yerba-700 hover:underline"
                      >
                        WhatsApp
                      </a>
                    </>
                  ) : null}
                  . También está{" "}
                  <Link
                    href="/contacto"
                    className="text-yerba-700 font-medium hover:underline"
                  >
                    Contacto
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
