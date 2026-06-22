"use client";

import Link from "next/link";
import { ShoppingCart, AlertCircle, Check } from "lucide-react";
import { Product } from "@repo/types";
import { useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  index?: number;
}

// Card de producto. El hover (scale de imagen, cross-fade, botón quick-add) se
// resuelve con CSS `group-hover` en vez de estado React + Motion: evita re-renders
// en cada hover y el costo de Framer. La entrada usa tw-animate-css (no Motion layout).
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem, openCart } = useCartStore();

  // Generative UI: Calcula el stock total de todas las variantes
  const totalStock =
    product.variants?.reduce((acc, variant) => {
      return acc + (variant.stock || 0);
    }, 0) || 0;

  const hasStock = totalStock > 0;
  const isLowStock = totalStock > 0 && totalStock < 5;

  // Systems-Oriented: Precio mínimo para mostrar "desde"
  const firstAvailableVariant =
    product.variants?.find((v) => v.stock > 0) || product.variants?.[0];
  const minPrice = firstAvailableVariant?.price || 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasStock || !firstAvailableVariant) {
      toast.error("Producto sin stock");
      return;
    }

    // Human-Core: Feedback táctil natural
    setIsAdding(true);

    try {
      // Systems-Oriented: Agregar al store global
      addItem(product, firstAvailableVariant, 1);

      setTimeout(() => {
        setIsAdding(false);
        toast.success(`${product.name} agregado al carrito`, {
          description: firstAvailableVariant.name,
          action: {
            label: "Ver carrito",
            onClick: () => openCart(),
          },
        });
      }, 400);
    } catch (error) {
      setIsAdding(false);
      toast.error(
        error instanceof Error ? error.message : "Error al agregar al carrito",
      );
    }
  };

  return (
    <article
      // Entrada escalonada por CSS (delay capado para no retrasar el LCP en grids grandes)
      style={{
        animationDelay: `${Math.min(index, 7) * 60}ms`,
        animationDuration: "500ms",
      }}
      className="group relative bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both"
      data-product-id={product.id}
      data-category={product.category?.name}
    >
      {/* Agents-Ready: Estructura semántica clara */}
      <Link href={`/productos/${product.slug}`} className="block">
        {/* Image Container - Human-Core: Organic feel */}
        <div className="aspect-square bg-stone-100 relative overflow-hidden">
          {/* Placeholder Image */}
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-105">
            {product.images?.[0] ? (
              <>
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className={`object-cover transition-opacity duration-500 ${product.images[1] ? "group-hover:opacity-0" : ""}`}
                />
                {product.images[1] && (
                  <Image
                    src={product.images[1]}
                    alt={`${product.name} - Vista alternativa`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <div className="text-center">
                <span className="text-6xl block mb-2">🧉</span>
                <span className="text-stone-400 text-sm">
                  {product.category?.name}
                </span>
              </div>
            )}
          </div>

          {/* Generative UI: Badge de stock adaptativo */}
          {!hasStock && (
            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
              <span className="bg-stone-800 text-white px-4 py-2 rounded-full text-sm font-medium">
                Sin Stock
              </span>
            </div>
          )}

          {isLowStock && (
            <div className="absolute top-3 left-3 bg-earth-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-300">
              <AlertCircle className="w-3 h-3" />
              ¡Últimas {totalStock}!
            </div>
          )}

          {/* Quick Add Button - Systems-Oriented: Conexión directa al carrito */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!hasStock || isAdding}
            aria-label={`Agregar ${product.name} al carrito`}
            className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 ${
              hasStock
                ? "bg-yerba-600 text-white hover:bg-yerba-700"
                : "bg-stone-300 text-stone-500 cursor-not-allowed"
            }`}
          >
            {isAdding ? (
              <Check className="w-5 h-5" />
            ) : (
              <ShoppingCart className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Content - Agents-Ready: Datos estructurados */}
        <div className="p-5">
          {/* Category Tag */}
          <span className="text-xs font-medium text-yerba-600 uppercase tracking-wider">
            {product.category?.name || "Producto"}
          </span>

          {/* Title */}
          <h3 className="font-serif text-lg font-semibold text-stone-900 mt-1 mb-2 line-clamp-2">
            {product.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-stone-500 line-clamp-2 mb-4">
            {product.description || "Yerba mate premium seleccionada"}
          </p>

          {/* Price & Stock - Generative UI: Info contextual */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-stone-400">Desde</span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-2xl font-bold text-yerba-600">
                  ${(minPrice || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Stock Indicator - Human-Core: Pulso sutil si hay stock bajo */}
            {hasStock && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full bg-yerba-500 ${isLowStock ? "animate-pulse" : ""}`}
                />
                <span className="text-xs text-stone-500">
                  {totalStock} disponibles
                </span>
              </div>
            )}
          </div>

          {/* Variants Preview - Generative: Muestra opciones disponibles */}
          {product.variants && product.variants.length > 1 && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="flex flex-wrap gap-2">
                {product.variants.slice(0, 3).map((variant) => (
                  <span
                    key={variant.id}
                    className={`text-xs px-2 py-1 rounded-md ${
                      variant.stock && variant.stock > 0
                        ? "bg-yerba-50 text-yerba-700"
                        : "bg-stone-100 text-stone-400 line-through"
                    }`}
                  >
                    {variant.name}
                  </span>
                ))}
                {product.variants.length > 3 && (
                  <span className="text-xs px-2 py-1 text-stone-400">
                    +{product.variants.length - 3} más
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
