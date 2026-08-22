import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Leaf, MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import {
  brand,
  displayWhatsAppPhone,
  locationLineWithPostal,
  mailtoHref,
  pickupAddress,
  whatsappHref,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribinos por WhatsApp o email. Pedidos, envíos y consultas sobre yerba mate.",
  openGraph: {
    title: `Contacto | ${brand.name}`,
    description:
      "Escribinos por WhatsApp o email. Pedidos, envíos y consultas sobre yerba mate.",
  },
};

export default function ContactoPage() {
  const waHref = whatsappHref(
    "Hola, te escribo desde la tienda de YerbaXanaes.",
  );
  const waPhone = displayWhatsAppPhone();

  const contactInfo: Array<{
    icon: typeof MapPin;
    label: string;
    value: string;
    href?: string;
  }> = [
    {
      icon: MapPin,
      label: "Ubicación",
      value: locationLineWithPostal(),
    },
    {
      icon: MapPin,
      label: "Retiro en el local",
      value: pickupAddress(),
    },
    ...(waHref
      ? [
          {
            icon: Phone,
            label: "WhatsApp",
            value: waPhone ?? "Escribinos por WhatsApp",
            href: waHref,
          },
        ]
      : []),
    {
      icon: Mail,
      label: "Email",
      value: brand.email,
      href: mailtoHref(),
    },
  ];

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
                <span>Estamos para ayudarte</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-4">
                Contacto
              </h1>
              <p className="text-lg text-stone-600">
                Cualquier duda sobre pedidos, envíos o productos, escribinos.
                Te respondemos por WhatsApp o email.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="font-serif text-2xl font-bold text-stone-900 mb-8">
                Información de contacto
              </h2>

              <div className="space-y-6 mb-10">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-yerba-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon
                        className="h-5 w-5 text-yerba-600"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500 font-medium mb-0.5">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-stone-900 font-semibold hover:text-yerba-600 transition-colors"
                          target={
                            item.href.startsWith("https")
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            item.href.startsWith("https")
                              ? "noopener noreferrer"
                              : undefined
                          }
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-stone-900 font-semibold">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yerba-50 rounded-2xl p-6 border border-yerba-100">
                <h3 className="font-semibold text-stone-900 mb-2">
                  {waHref
                    ? "La vía más rápida es WhatsApp"
                    : "Escribinos por email"}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed mb-4">
                  Consultas de stock, pedidos, envíos o retiro en el local.
                  No hay formulario en el sitio: te respondemos por estos
                  canales.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-yerba-700 transition-colors"
                    >
                      Escribirnos por WhatsApp
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                  <a
                    href={mailtoHref("Consulta desde la tienda")}
                    className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-200 px-6 py-3 rounded-full font-semibold text-sm hover:border-yerba-600 hover:text-yerba-600 transition-colors"
                  >
                    Enviar un email
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </a>
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
