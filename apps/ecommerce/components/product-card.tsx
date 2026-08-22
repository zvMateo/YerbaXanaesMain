"use client";

import Link from "next/link";
import { ShoppingCart, AlertCircle, Check, Leaf } from "lucide-react";
import { Product } from "@repo/types";
import { useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import { sortVariantsBySize } from "@/lib/variant-order";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addItem, removeItem, updateQuantity } = useCartStore();

  const totalStock =
    product.variants?.reduce((acc, variant) => {
      return acc + (variant.stock || 0);
    }, 0) || 0;

  const hasStock = totalStock > 0;
  const isLowStock = totalStock > 0 && totalStock < 5;

  const cheapestVariant =
    product.variants && product.variants.length > 0
      ? [...product.variants].sort(
          (a, b) =>
            (a.stock > 0 ? 0 : 1) - (b.stock > 0 ? 0 : 1) || a.price - b.price,
        )[0]
      : undefined;
  const minPrice = cheapestVariant?.price || 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasStock || !cheapestVariant) {
      toast.error("Producto sin stock");
      return;
    }

    setIsAdding(true);

    try {
      const existing = useCartStore
        .getState()
        .items.find((item) => item.variantId === cheapestVariant.id);
      const prevQty = existing?.quantity ?? 0;
      const prevId = existing?.id;

      addItem(product, cheapestVariant, 1);

      const added = useCartStore
        .getState()
        .items.find((item) => item.variantId === cheapestVariant.id);

      setTimeout(() => {
        setIsAdding(false);
        toast.success(`${product.name} agregado al carrito`, {
          description: cheapestVariant.name,
          action: {
            label: "Deshacer",
            onClick: () => {
              if (!added) return;
              if (prevQty <= 0) {
                removeItem(added.id);
              } else if (prevId) {
                updateQuantity(prevId, prevQty);
              }
            },
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
      style={{
        animationDelay: `${Math.min(index, 7) * 60}ms`,
        animationDuration: "500ms",
      }}
      className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300 animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both"
      data-product-id={product.id}
      data-category={product.category?.name}
    >
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="aspect-square bg-muted relative overflow-hidden">
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
              <div className="text-center text-palm">
                <Leaf className="h-16 w-16 mx-auto mb-2" aria-hidden="true" />
                <span className="text-muted-foreground text-sm">
                  {product.category?.name}
                </span>
              </div>
            )}
          </div>

          {!hasStock && (
            <div className="absolute inset-0 bg-shadow/60 flex items-center justify-center">
              <span className="bg-shadow text-cream px-4 py-2 rounded-full text-sm font-medium">
                Sin Stock
              </span>
            </div>
          )}

          {isLowStock && (
            <div className="absolute top-3 left-3 bg-cream text-shadow border-2 border-terra px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-300">
              <AlertCircle className="w-3 h-3" />
              ¡Últimas {totalStock}!
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!hasStock || isAdding}
            aria-label={`Agregar ${product.name} al carrito`}
            className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 ${
              hasStock
                ? "bg-terra text-shadow hover:bg-terra/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isAdding ? (
              <Check className="w-5 h-5" />
            ) : (
              <ShoppingCart className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="p-5">
          <span className="text-xs font-medium text-palm uppercase tracking-wider">
            {product.category?.name || "Producto"}
          </span>

          <h3 className="font-serif text-lg font-semibold text-shadow mt-1 mb-2 line-clamp-2">
            {product.name}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {product.description || "Yerba mate premium seleccionada"}
          </p>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Desde</span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-2xl font-bold text-palm">
                  ${(minPrice || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {hasStock && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full bg-palm ${isLowStock ? "animate-pulse" : ""}`}
                />
                <span className="text-xs text-muted-foreground">
                  {totalStock} disponibles
                </span>
              </div>
            )}
          </div>

          {product.variants && product.variants.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {sortVariantsBySize(product.variants)
                  .slice(0, 3)
                  .map((variant) => (
                    <span
                      key={variant.id}
                      className={`text-xs px-2 py-1 rounded-md ${
                        variant.stock && variant.stock > 0
                          ? "bg-muted text-shadow"
                          : "bg-muted/60 text-muted-foreground line-through"
                      }`}
                    >
                      {variant.name}
                    </span>
                  ))}
                {product.variants.length > 3 && (
                  <span className="text-xs px-2 py-1 text-muted-foreground">
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
