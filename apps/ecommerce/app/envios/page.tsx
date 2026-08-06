import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/static-page-shell";
import { brand, shippingWhatsappUrl, whatsappUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Envíos",
  description:
    "Envíos a todo el país con Correo Argentino y retiro. Información de plazos y costos de YerbaXanaes.",
};

export default function EnviosPage() {
  return (
    <StaticPageShell
      title="Envíos"
      description="Llegamos a todo el país. Cotizamos con Correo Argentino en el checkout."
    >
      <div className="space-y-8 text-stone-700 leading-relaxed not-prose">
        <section>
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
            Modalidades
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Envío a domicilio</strong> — cotizado en tiempo real con
              Correo Argentino según tu código postal y el peso del pedido.
            </li>
            <li>
              <strong>Retiro en sucursal de Correo</strong> — elegís la sucursal
              en el checkout cuando la cotización lo permite.
            </li>
            <li>
              <strong>Retiro en punto de origen</strong> — coordinamos por
              WhatsApp si preferís retirar en {brand.city}, {brand.region}.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
            Costos y plazos
          </h2>
          <p>
            El costo y el plazo estimados se calculan al finalizar la compra,
            con tu código postal. Pueden variar según zona, peso del paquete y
            el servicio de Correo disponible.
          </p>
          <p className="mt-3">
            En pedidos que superen el umbral de envío gratis configurado en la
            tienda (referencia actual: desde $
            {brand.freeShippingFromArs.toLocaleString("es-AR")}), el envío puede
            no tener cargo — siempre se confirma en el checkout.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
            Si no aparece cotización
          </h2>
          <p>
            A veces la API de Correo no devuelve tarifa para un CP. En ese caso
            podés{" "}
            <a
              href={shippingWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yerba-700 font-medium hover:underline"
            >
              cotizar por WhatsApp
            </a>{" "}
            y te armamos el envío a mano.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
            Seguimiento
          </h2>
          <p>
            Cuando despachamos, te compartimos el número de seguimiento por el
            canal de contacto del pedido (email o WhatsApp). Si tenés dudas:{" "}
            <a
              href={whatsappUrl("Hola, consulto por el seguimiento de mi pedido")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yerba-700 font-medium hover:underline"
            >
              {brand.whatsappDisplay}
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-stone-500">
          Más info en{" "}
          <Link href="/faq" className="text-yerba-700 hover:underline">
            Preguntas frecuentes
          </Link>{" "}
          o{" "}
          <Link href="/contacto" className="text-yerba-700 hover:underline">
            Contacto
          </Link>
          .
        </p>
      </div>
    </StaticPageShell>
  );
}
