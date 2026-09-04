"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "@/lib/utils";
import { BrandSeal } from "@/components/brand-seal";
import { brand } from "@/lib/brand";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/envios", label: "Envíos" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { items, toggleCart } = useCartStore();
  const pathname = usePathname();

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  const mobileMenu =
    mounted &&
    createPortal(
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              key="nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 z-[70] bg-shadow/40 lg:hidden"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-menu"
              key="nav-sheet"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-16 bottom-0 z-[80] overflow-y-auto bg-cream lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menú"
            >
              <nav
                className="flex flex-col px-4 py-4"
                aria-label="Navegación móvil"
              >
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "flex items-center min-h-11 px-3 rounded-lg font-medium transition-colors",
                      isActive(link.href)
                        ? "text-palm bg-muted"
                        : "text-shadow/70 hover:text-palm hover:bg-muted",
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mx-4 mb-8 rounded-xl border border-border bg-card p-4 text-sm text-shadow/80">
                <p className="font-medium text-shadow">Retiro en origen</p>
                <p className="mt-1 leading-relaxed">{brand.locationLabel}</p>
                <div className="mt-3 flex flex-col gap-1">
                  <Link
                    href="/envios"
                    className="inline-flex min-h-11 items-center text-palm font-semibold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Envíos y retiro
                  </Link>
                  <Link
                    href="/contacto"
                    className="inline-flex min-h-11 items-center text-palm font-semibold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contacto
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body,
    );

  return (
    <header className="sticky top-0 z-[90] w-full bg-cream/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2 min-h-11"
            onClick={() => setIsMenuOpen(false)}
          >
            <BrandSeal size={40} className="h-10 w-10" />
            <span className="font-serif text-xl font-bold text-shadow">
              YerbaXanaes
            </span>
          </Link>

          <nav
            className="hidden lg:flex items-center gap-6"
            aria-label="Navegación principal"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "inline-flex items-center min-h-11 font-medium transition-colors",
                  isActive(link.href)
                    ? "text-palm"
                    : "text-shadow/70 hover:text-palm",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsMenuOpen(false);
                toggleCart();
              }}
              className="relative inline-flex h-11 w-11 items-center justify-center text-shadow/70 hover:text-palm transition-colors cursor-pointer"
              aria-label={
                itemCount > 0
                  ? `Abrir carrito (${itemCount} producto${itemCount !== 1 ? "s" : ""})`
                  : "Abrir carrito"
              }
            >
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />

              <AnimatePresence mode="wait">
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute top-0.5 right-0.5 h-5 min-w-5 px-1 rounded-full bg-palm text-white text-xs flex items-center justify-center font-bold"
                    aria-hidden="true"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <button
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center text-shadow/70 cursor-pointer"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
      {mobileMenu}
    </header>
  );
}
