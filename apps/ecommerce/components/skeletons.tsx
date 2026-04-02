"use client";

import { motion } from "motion/react";

// Skeleton para tarjeta de producto
export function ProductCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100"
    >
      {/* Imagen */}
      <div className="aspect-square bg-stone-200 animate-pulse" />

      {/* Contenido */}
      <div className="p-4 space-y-3">
        {/* Categoría */}
        <div className="h-4 bg-stone-200 rounded animate-pulse w-1/3" />

        {/* Título */}
        <div className="h-6 bg-stone-200 rounded animate-pulse" />

        {/* Precio y stock */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-stone-200 rounded animate-pulse w-24" />
          <div className="h-4 bg-stone-200 rounded animate-pulse w-16" />
        </div>

        {/* Botón */}
        <div className="h-10 bg-stone-200 rounded-full animate-pulse" />
      </div>
    </motion.div>
  );
}

// Skeleton para grid de productos
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton para página de producto detalle
export function ProductDetailSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
      {/* Imagen */}
      <div className="aspect-square bg-stone-200 rounded-2xl animate-pulse" />

      {/* Info */}
      <div className="space-y-6">
        {/* Categoría */}
        <div className="h-5 bg-stone-200 rounded animate-pulse w-32" />

        {/* Título */}
        <div className="h-10 bg-stone-200 rounded animate-pulse" />
        <div className="h-10 bg-stone-200 rounded animate-pulse w-2/3" />

        {/* Descripción */}
        <div className="space-y-2">
          <div className="h-4 bg-stone-200 rounded animate-pulse" />
          <div className="h-4 bg-stone-200 rounded animate-pulse" />
          <div className="h-4 bg-stone-200 rounded animate-pulse w-3/4" />
        </div>

        {/* Variantes */}
        <div className="space-y-3 pt-4">
          <div className="h-5 bg-stone-200 rounded animate-pulse w-32" />
          <div className="flex gap-3">
            <div className="h-14 bg-stone-200 rounded-xl animate-pulse w-24" />
            <div className="h-14 bg-stone-200 rounded-xl animate-pulse w-24" />
            <div className="h-14 bg-stone-200 rounded-xl animate-pulse w-24" />
          </div>
        </div>

        {/* Precio y botón */}
        <div className="pt-4 space-y-4">
          <div className="h-8 bg-stone-200 rounded animate-pulse w-32" />
          <div className="h-14 bg-stone-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para filtros
export function ProductFiltersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 bg-stone-200 rounded animate-pulse w-32" />

      {/* Categorías */}
      <div className="space-y-2">
        <div className="h-4 bg-stone-200 rounded animate-pulse" />
        <div className="h-4 bg-stone-200 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-stone-200 rounded animate-pulse w-4/6" />
        <div className="h-4 bg-stone-200 rounded animate-pulse w-5/6" />
      </div>

      {/* Precio */}
      <div className="space-y-2 pt-4">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-24" />
        <div className="h-8 bg-stone-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton para checkout
export function CheckoutSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Steps */}
      <div className="flex justify-between">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <div className="w-10 h-10 bg-stone-200 rounded-full animate-pulse" />
            {i < 3 && <div className="w-16 sm:w-24 h-1 bg-stone-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        <div className="h-8 bg-stone-200 rounded animate-pulse w-2/3" />

        <div className="space-y-4">
          <div className="h-12 bg-stone-200 rounded animate-pulse" />
          <div className="h-12 bg-stone-200 rounded animate-pulse" />
          <div className="h-12 bg-stone-200 rounded animate-pulse" />
        </div>

        <div className="flex justify-between pt-6">
          <div className="h-12 bg-stone-200 rounded animate-pulse w-24" />
          <div className="h-12 bg-stone-200 rounded-full animate-pulse w-32" />
        </div>
      </div>
    </div>
  );
}
