import Link from "next/link";
import { Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { brand, whatsappUrl } from "@/lib/brand";
import { BrandSeal } from "@/components/brand-seal";

export function Footer() {
  return (
    <footer className="bg-shadow text-cream/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6">
              <BrandSeal size={32} className="h-8 w-8" />
              <span className="font-serif text-xl font-bold text-cream">
                {brand.businessName}
              </span>
            </Link>
            <p className="text-cream/60 mb-6">{brand.tagline}</p>
            {(brand.social.instagram || brand.social.facebook) && (
              <div className="flex gap-4">
                {brand.social.instagram && (
                  <a
                    href={brand.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {brand.social.facebook && (
                  <a
                    href={brand.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-cream font-semibold mb-6">Productos</h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/productos"
                  className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                >
                  Ver catálogo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-cream font-semibold mb-6">Empresa</h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/nosotros"
                  className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                >
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                >
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link
                  href="/envios"
                  className="inline-flex min-h-11 items-center text-cream/60 hover:text-leaf transition-colors"
                >
                  Envíos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-cream font-semibold mb-6">Contacto</h3>
            <ul className="space-y-1">
              <li className="flex items-center gap-3 text-cream/60">
                <MapPin className="h-5 w-5 text-leaf shrink-0" />
                <span>{brand.locationLabel}</span>
              </li>
              <li className="flex items-center gap-3 text-cream/60">
                <Phone className="h-5 w-5 text-leaf shrink-0" />
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center hover:text-leaf transition-colors"
                >
                  {brand.whatsappDisplay}
                </a>
              </li>
              <li className="flex items-center gap-3 text-cream/60">
                <Mail className="h-5 w-5 text-leaf shrink-0" />
                <a
                  href={`mailto:${brand.email}`}
                  className="inline-flex min-h-11 items-center hover:text-leaf transition-colors break-all"
                >
                  {brand.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/15 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-cream/45">
            © {new Date().getFullYear()} {brand.businessName}. Todos los
            derechos reservados.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-cream/45">
            <Link
              href="/terminos"
              className="inline-flex min-h-11 items-center hover:text-leaf transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacidad"
              className="inline-flex min-h-11 items-center hover:text-leaf transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
