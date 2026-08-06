import Link from "next/link";
import { Leaf, Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { brand, whatsappUrl } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Leaf className="h-8 w-8 text-yerba-400" />
              <span className="font-serif text-xl font-bold text-white">
                {brand.businessName}
              </span>
            </Link>
            <p className="text-stone-400 mb-6">{brand.tagline}</p>
            {(brand.social.instagram || brand.social.facebook) && (
              <div className="flex gap-4">
                {brand.social.instagram && (
                  <a
                    href={brand.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-yerba-400 transition-colors"
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
                    className="text-stone-400 hover:text-yerba-400 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-6">Productos</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/productos"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Ver catálogo
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-6">Empresa</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/nosotros"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link
                  href="/envios"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Envíos
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-6">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-stone-400">
                <MapPin className="h-5 w-5 text-yerba-400 shrink-0" />
                <span>{brand.locationLabel}</span>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <Phone className="h-5 w-5 text-yerba-400 shrink-0" />
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yerba-400 transition-colors"
                >
                  {brand.whatsappDisplay}
                </a>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <Mail className="h-5 w-5 text-yerba-400 shrink-0" />
                <a
                  href={`mailto:${brand.email}`}
                  className="hover:text-yerba-400 transition-colors"
                >
                  {brand.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-stone-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500">
            © {new Date().getFullYear()} {brand.businessName}. Todos los
            derechos reservados.
          </p>
          <div className="flex gap-6 text-sm text-stone-500">
            <Link
              href="/terminos"
              className="hover:text-yerba-400 transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacidad"
              className="hover:text-yerba-400 transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
