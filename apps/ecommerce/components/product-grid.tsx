"use client";

import { Product } from "@repo/types";
import { ProductCard } from "./product-card";
import { PackageX, Phone } from "lucide-react";
import { whatsappUrl } from "@/lib/brand";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

// Grid de productos. Las animaciones de entrada son CSS (tw-animate-css) en vez de
// Framer/Motion `layout` + AnimatePresence: el FLIP de layout reordenaba el DOM en
// cada filtro y disparaba INP alto en mobile. Con CSS el reordenado es nativo.
export function ProductGrid({ products, isLoading }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-stone-200" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-stone-200 rounded w-1/3" />
              <div className="h-6 bg-stone-200 rounded" />
              <div className="h-4 bg-stone-200 rounded w-2/3" />
              <div className="flex justify-between pt-4">
                <div className="h-8 bg-stone-200 rounded w-24" />
                <div className="h-10 bg-stone-200 rounded-full w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-yerba-50 rounded-full mb-6 border border-yerba-100">
          <PackageX className="h-10 w-10 text-yerba-600" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-stone-900 mb-2">
          Catálogo en preparación
        </h3>
        <p className="text-stone-500 max-w-md mx-auto mb-6">
          Estamos cargando los productos. Si buscás una yerba o un combo en
          particular, escribinos y te armamos el pedido.
        </p>
        <a
          href={whatsappUrl(
            "Hola YerbaXanaes, quiero consultar por productos disponibles",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-yerba-700 transition-colors"
        >
          Consultar por WhatsApp
          <Phone className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
