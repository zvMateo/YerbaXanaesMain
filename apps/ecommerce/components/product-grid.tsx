"use client";

import { motion, AnimatePresence } from "motion/react";
import { Product } from "@repo/types";
import { ProductCard } from "./product-card";
import { PackageX } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

// Systems-Oriented: Grid que mantiene estado durante navegación
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-100 rounded-full mb-6">
          <PackageX className="h-10 w-10 text-stone-400" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-stone-900 mb-2">
          No encontramos productos
        </h3>
        <p className="text-stone-500 max-w-md mx-auto">
          Intentá con otros filtros o volvé a ver todos los productos.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
