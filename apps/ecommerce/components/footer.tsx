import Link from "next/link";
import { Leaf, Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";

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
                YerbaXanaes
              </span>
            </Link>
            <p className="text-stone-400 mb-6">
              Llevando la tradición del mate argentino a tu hogar con la mejor
              calidad y sabor.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-stone-400 hover:text-yerba-400 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-stone-400 hover:text-yerba-400 transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
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
                  Yerbas
                </Link>
              </li>
              <li>
                <Link
                  href="/productos"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Mates
                </Link>
              </li>
              <li>
                <Link
                  href="/productos"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Bombillas
                </Link>
              </li>
              <li>
                <Link
                  href="/productos"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Accesorios
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
                  href="#"
                  className="text-stone-400 hover:text-yerba-400 transition-colors"
                >
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link
                  href="#"
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
                <MapPin className="h-5 w-5 text-yerba-400" />
                <span>Buenos Aires, Argentina</span>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <Phone className="h-5 w-5 text-yerba-400" />
                <span>+54 11 1234-5678</span>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <Mail className="h-5 w-5 text-yerba-400" />
                <span>hola@yerbaxanaes.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-stone-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500">
            © {new Date().getFullYear()} YerbaXanaes. Todos los derechos
            reservados.
          </p>
          <div className="flex gap-6 text-sm text-stone-500">
            <Link href="#" className="hover:text-yerba-400 transition-colors">
              Términos y Condiciones
            </Link>
            <Link href="#" className="hover:text-yerba-400 transition-colors">
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
