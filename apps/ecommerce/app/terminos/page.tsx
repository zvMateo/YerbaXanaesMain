import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageShell } from "@/components/static-page-shell";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Términos y condiciones de uso de la tienda online ${brand.businessName}.`,
};

export default function TerminosPage() {
  return (
    <StaticPageShell
      title="Términos y condiciones"
      description="Condiciones de uso de la tienda online."
    >
      <div className="space-y-6 text-stone-700 leading-relaxed not-prose text-sm sm:text-base">
        <p>
          Al utilizar el sitio web de {brand.businessName} y realizar una
          compra, aceptás estos términos. Si no estás de acuerdo, no uses la
          tienda.
        </p>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            1. Identificación
          </h2>
          <p>
            {brand.businessName} opera la tienda online de yerba mate y
            productos relacionados, con base en {brand.locationLabel}. Contacto:{" "}
            {brand.email} / {brand.whatsappDisplay}.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            2. Productos y precios
          </h2>
          <p>
            Los precios se muestran en pesos argentinos (ARS) e incluyen o
            detallan impuestos según se indique en el checkout. Nos reservamos
            el derecho de corregir errores evidentes de precio o stock y de
            cancelar pedidos en caso de error material o falta de stock,
            reintegrando lo abonado cuando corresponda.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            3. Pedidos y pago
          </h2>
          <p>
            El pedido se confirma cuando el pago es aprobado por Mercado Pago
            (u otro medio habilitado). Los estados “pendiente” o “en proceso”
            no garantizan el despacho hasta la confirmación del cobro.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            4. Envíos
          </h2>
          <p>
            Los envíos se realizan según lo indicado en{" "}
            <Link href="/envios" className="text-yerba-700 hover:underline">
              Envíos
            </Link>
            . Los plazos son estimativos y pueden variar por causas del
            transportista o fuerza mayor.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            5. Derecho de arrepentimiento / cambios
          </h2>
          <p>
            Según la normativa argentina aplicable a compras a distancia, el
            consumidor puede ejercer derechos de arrepentimiento en los plazos
            y condiciones legales. Contactanos a la brevedad por WhatsApp o
            email para gestionar el caso.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            6. Propiedad intelectual
          </h2>
          <p>
            Marcas, textos, imágenes y diseño del sitio pertenecen a{" "}
            {brand.businessName} o a sus licenciantes. No está permitido copiar
            o reutilizar el contenido sin autorización.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            7. Limitación
          </h2>
          <p>
            En la medida permitida por la ley, {brand.businessName} no será
            responsable por daños indirectos derivados del uso del sitio o de
            demoras de terceros (pasarelas de pago, correo, etc.).
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
            8. Privacidad
          </h2>
          <p>
            El tratamiento de datos personales se detalla en la{" "}
            <Link href="/privacidad" className="text-yerba-700 hover:underline">
              Política de privacidad
            </Link>
            .
          </p>
        </section>

        <p className="text-stone-500 text-sm">
          Última actualización: agosto 2026. Este texto es informativo; si
          necesitás un marco legal formal para tu actividad, consultá un
          profesional.
        </p>
      </div>
    </StaticPageShell>
  );
}
