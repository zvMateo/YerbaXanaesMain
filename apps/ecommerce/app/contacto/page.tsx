import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ContactForm } from "@/components/contact-form";
import { Leaf, MapPin, Phone, Mail, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contactanos por cualquier consulta sobre yerba mate, pedidos o envíos. Estamos para ayudarte.",
  openGraph: {
    title: "Contacto | YerbaXanaes",
    description:
      "Contactanos por cualquier consulta sobre yerba mate, pedidos o envíos.",
  },
};

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Ubicación",
    value: "Buenos Aires, Argentina",
  },
  {
    icon: Phone,
    label: "WhatsApp",
    value: "+54 11 0000-0000",
    href: "https://wa.me/541100000000",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hola@yerbaxanaes.com",
    href: "mailto:hola@yerbaxanaes.com",
  },
  {
    icon: Clock,
    label: "Horarios",
    value: "Lun–Vie 9 a 18 hs",
  },
];

export default function ContactoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
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
                Te respondemos a la brevedad.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">
              {/* Contact info */}
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-8">
                  Información de contacto
                </h2>

                <div className="space-y-6 mb-10">
                  {CONTACT_INFO.map((item) => (
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
                    Consultas rápidas por WhatsApp
                  </h3>
                  <p className="text-stone-600 text-sm leading-relaxed mb-4">
                    Para consultas sobre disponibilidad de stock, combos
                    especiales o seguimiento de pedidos, el WhatsApp es la vía
                    más rápida.
                  </p>
                  <a
                    href="https://wa.me/541100000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-yerba-700 transition-colors"
                  >
                    Escribirnos por WhatsApp
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Form */}
              <div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-8">
                  Envianos un mensaje
                </h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
