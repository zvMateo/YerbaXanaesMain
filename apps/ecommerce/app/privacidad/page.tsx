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
  title: "Política de privacidad",
  description: `Cómo usamos los datos de tu pedido en ${brand.name}.`,
};

export default function PrivacidadPage() {
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
                <span>Tus datos</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-4">
                Política de privacidad
              </h1>
              <p className="text-lg text-stone-600">
                Qué datos pedimos y para qué los usamos.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-10 text-stone-600 leading-relaxed">
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Responsable
                </h2>
                <p>
                  {brand.name}, {locationLineWithPostal()}, Argentina. Sitio:{" "}
                  {brand.siteUrl.replace(/^https?:\/\//, "")}. Contacto:{" "}
                  <a
                    href={mailtoHref()}
                    className="text-yerba-700 hover:underline"
                  >
                    {brand.email}
                  </a>
                  {waHref ? " y WhatsApp publicado en la tienda" : ""}.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Qué datos reunimos
                </h2>
                <p>
                  Cuando comprás como invitado, pedimos los datos necesarios
                  para cumplir el pedido: nombre, email, teléfono y, si
                  corresponde, dirección o sucursal de Correo Argentino. No
                  pedimos cuenta ni contraseña para comprar.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Para qué los usamos
                </h2>
                <p>
                  Para confirmar el pedido, coordinar el envío o el retiro,
                  contactarte si hace falta y cumplir obligaciones legales
                  del cobro. No usamos esos datos para un newsletter: la
                  tienda no tiene suscripción por email.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Pagos
                </h2>
                <p>
                  El pago lo procesa Mercado Pago. Los datos de tarjeta u
                  otros medios de pago se ingresan en Mercado Pago;{" "}
                  {brand.name} no los guarda.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">
                  Envíos
                </h2>
                <p>
                  Si elegís envío, compartimos con Correo Argentino los
                  datos necesarios para despachar (destinatario, dirección o
                  sucursal). El detalle operativo está en{" "}
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
                  Conservación y consultas
                </h2>
                <p>
                  Conservamos los datos del pedido el tiempo necesario para
                  cumplirlo y para obligaciones contables o legales. Para
                  acceder, corregir o preguntar por tus datos, escribinos a{" "}
                  <a
                    href={mailtoHref("Consulta de privacidad")}
                    className="text-yerba-700 hover:underline"
                  >
                    {brand.email}
                  </a>
                  {waHref ? (
                    <>
                      {" "}
                      o por{" "}
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
