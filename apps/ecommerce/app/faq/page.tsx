import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Leaf, MessageCircle } from "lucide-react";
import { brand, mailtoHref, pickupAddress, whatsappHref } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Cómo pedir, pagar con Mercado Pago, envíos y retiro en el local.",
  openGraph: {
    title: `Preguntas frecuentes | ${brand.name}`,
    description:
      "Cómo pedir, pagar con Mercado Pago, envíos y retiro en el local.",
  },
};

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: "¿Cómo hago un pedido?",
    a: (
      <>
        Armá el carrito, avanzá al checkout como invitado (no hace falta
        crear cuenta) y completá tus datos. Pagás con Mercado Pago en la
        misma pantalla.
      </>
    ),
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: (
      <>
        Mercado Pago (Payment Brick): tarjetas, dinero en cuenta y otros
        medios que ofrezca Mercado Pago al momento de pagar. El cobro lo
        procesa Mercado Pago.
      </>
    ),
  },
  {
    q: "¿Cómo funciona el envío?",
    a: (
      <>
        Enviamos a todo el país con Correo Argentino, a domicilio o a
        sucursal. La tarifa se cotiza en el checkout con tu código postal.
        Más detalle en{" "}
        <Link href="/envios" className="text-yerba-700 font-medium hover:underline">
          Envíos
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Puedo retirar el pedido?",
    a: (
      <>
        Sí. En el checkout elegí retiro en el local. Dirección:{" "}
        {pickupAddress()}.
      </>
    ),
  },
  {
    q: "¿Hay envío gratis?",
    a: (
      <>
        En compras desde $15.000 el envío va sin cargo, según lo que
        muestre la tienda al armar el pedido.
      </>
    ),
  },
  {
    q: "¿Cómo los contacto?",
    a: (
      <>
        Por WhatsApp o por email a {brand.email}. No hay formulario de
        contacto en el sitio: te respondemos por esos canales.
      </>
    ),
  },
];

export default function FaqPage() {
  const waHref = whatsappHref(
    "Hola, tengo una consulta sobre un pedido de YerbaXanaes.",
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
                <span>Respuestas cortas</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-4">
                Preguntas frecuentes
              </h1>
              <p className="text-lg text-stone-600">
                Lo esencial para pedir, pagar y recibir tu yerba.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto divide-y divide-stone-200">
              {FAQS.map((item) => (
                <div key={item.q} className="py-8 first:pt-0">
                  <h2 className="font-serif text-xl font-bold text-stone-900 mb-3">
                    {item.q}
                  </h2>
                  <p className="text-stone-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>

            <div className="max-w-3xl mx-auto mt-8 bg-yerba-50 rounded-2xl p-6 border border-yerba-100">
              <h2 className="font-semibold text-stone-900 mb-2">
                ¿No está tu consulta?
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Escribinos y te ayudamos. También está{" "}
                <Link
                  href="/contacto"
                  className="text-yerba-700 font-medium hover:underline"
                >
                  la página de contacto
                </Link>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-yerba-700 transition-colors"
                  >
                    WhatsApp
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                <a
                  href={mailtoHref("Consulta desde FAQ")}
                  className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-200 px-6 py-3 rounded-full font-semibold text-sm hover:border-yerba-600 hover:text-yerba-600 transition-colors"
                >
                  {brand.email}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
