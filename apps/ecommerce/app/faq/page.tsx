import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { StaticPageShell } from "@/components/static-page-shell";
import { brand, whatsappUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas sobre pedidos, pagos con Mercado Pago, envíos y productos YerbaXanaes.",
};

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "¿Cómo pago?",
    a: (
      <>
        En la tienda online usamos <strong>Mercado Pago</strong> (tarjeta de
        crédito/débito, dinero en cuenta, y medios offline como Rapipago o Pago
        Fácil según disponibilidad). El cobro es seguro y no almacenamos datos
        de tarjeta.
      </>
    ),
  },
  {
    q: "¿Hacen envíos a todo el país?",
    a: (
      <>
        Sí. Cotizamos con Correo Argentino en el checkout. Detalle en{" "}
        <Link href="/envios" className="text-yerba-700 hover:underline">
          Envíos
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Cuánto tarda mi pedido?",
    a: "Depende de la zona y del servicio de Correo. El plazo estimado aparece al cotizar en el checkout. Preparación y despacho se hacen lo antes posible tras confirmar el pago.",
  },
  {
    q: "Mi pago quedó pendiente, ¿qué hago?",
    a: "Algunos medios (billetera o tickets) pueden quedar en revisión o pendientes de pago en un local. Cuando Mercado Pago confirma, actualizamos el pedido. Si tenés el comprobante y dudas, escribinos por WhatsApp con el número de orden.",
  },
  {
    q: "¿Puedo cambiar o cancelar un pedido?",
    a: "Si el pedido aún no se despachó, contactanos lo antes posible por WhatsApp o email y lo revisamos. Una vez en tránsito, se rige por las condiciones del correo.",
  },
  {
    q: "¿Dónde están ubicados?",
    a: (
      <>
        Operamos desde {brand.locationLabel}. Horario de atención:{" "}
        {brand.hours}.
      </>
    ),
  },
  {
    q: "¿Cómo los contacto?",
    a: (
      <>
        WhatsApp{" "}
        <a
          href={whatsappUrl()}
          className="text-yerba-700 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {brand.whatsappDisplay}
        </a>{" "}
        o email{" "}
        <a
          href={`mailto:${brand.email}`}
          className="text-yerba-700 hover:underline"
        >
          {brand.email}
        </a>
        . También en{" "}
        <Link href="/contacto" className="text-yerba-700 hover:underline">
          Contacto
        </Link>
        .
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <StaticPageShell
      title="Preguntas frecuentes"
      description="Lo esencial sobre compras, pagos y envíos."
    >
      <div className="space-y-8 not-prose">
        {FAQS.map((item) => (
          <div key={item.q}>
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
              {item.q}
            </h2>
            <p className="text-stone-700 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </StaticPageShell>
  );
}
