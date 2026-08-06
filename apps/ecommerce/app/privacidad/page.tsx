import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/static-page-shell";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${brand.businessName} trata los datos personales en la tienda online.`,
};

export default function PrivacidadPage() {
  return (
    <StaticPageShell
      title="Política de privacidad"
      description="Qué datos usamos y para qué."
    >
      <div className="space-y-6 text-stone-700 leading-relaxed not-prose text-sm sm:text-base">
        <p>
          En {brand.businessName} cuidamos tu información. Esta política
          describe qué datos recolectamos al usar la tienda y al comprar.
        </p>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            1. Responsable
          </h2>
          <p>
            {brand.businessName} — {brand.locationLabel}. Contacto:{" "}
            {brand.email} / {brand.whatsappDisplay}.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            2. Datos que recolectamos
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Checkout:</strong> nombre, email, teléfono, dirección de
              envío (si aplica), detalle del pedido.
            </li>
            <li>
              <strong>Pagos:</strong> procesados por Mercado Pago. No
              almacenamos números de tarjeta en nuestros servidores.
            </li>
            <li>
              <strong>Técnicos:</strong> cookies o almacenamiento local del
              carrito, y métricas de uso si están habilitadas (p. ej. analytics
              del hosting).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            3. Finalidad
          </h2>
          <p>
            Procesar y despachar pedidos, comunicarnos sobre la compra, mejorar
            el sitio, prevenir fraude y cumplir obligaciones legales.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            4. Destinatarios
          </h2>
          <p>
            Podemos compartir datos con proveedores necesarios para la
            operación: Mercado Pago (pagos), Correo Argentino / logística
            (envíos), hosting (Vercel/Railway u equivalentes) y herramientas de
            analítica si están activas. No vendemos tu información a terceros.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            5. Conservación
          </h2>
          <p>
            Conservamos los datos de pedidos el tiempo necesario para la
            relación comercial, contabilidad y plazos legales aplicables.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            6. Tus derechos
          </h2>
          <p>
            Podés solicitar acceso, corrección o eliminación de datos
            personales en la medida que permita la ley argentina de protección
            de datos personales. Escribinos a {brand.email}.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            7. Seguridad
          </h2>
          <p>
            Aplicamos medidas técnicas y organizativas razonables (HTTPS,
            control de acceso al panel, validación de webhooks de pago). Ningún
            sistema es 100% infalible.
          </p>
        </section>

        <p>
          Más info de compra:{" "}
          <Link href="/terminos" className="text-yerba-700 hover:underline">
            Términos y condiciones
          </Link>
          .
        </p>

        <p className="text-stone-500 text-sm">
          Última actualización: agosto 2026.
        </p>
      </div>
    </StaticPageShell>
  );
}
