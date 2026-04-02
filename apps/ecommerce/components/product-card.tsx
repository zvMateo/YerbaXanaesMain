"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ShoppingCart, AlertCircle, Check } from "lucide-react";
import { Product } from "@repo/types";
import { useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";

interface ProductCardProps {
  product: Product;
  index?: number;
}

// Human-Core: Card con micro-animaciones orgánicas y estados "vivos"
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
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
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94], // Human-Core: Curva de animación natural
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
      data-product-id={product.id}
      data-category={product.category?.name}
    >
      {/* Agents-Ready: Estructura semántica clara */}
      <Link href={`/productos/${product.id}`} className="block">
        {/* Image Container - Human-Core: Organic feel */}
        <div className="aspect-square bg-stone-100 relative overflow-hidden">
          {/* Placeholder Image */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <span className="text-6xl block mb-2">🧉</span>
                <span className="text-stone-400 text-sm">
                  {product.category?.name}
                </span>
              </div>
            )}
          </motion.div>

          {/* Generative UI: Badge de stock adaptativo */}
          {!hasStock && (
            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
              <span className="bg-stone-800 text-white px-4 py-2 rounded-full text-sm font-medium">
                Sin Stock
              </span>
            </div>
          )}

          {isLowStock && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-3 left-3 bg-earth-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              ¡Últimas {totalStock}!
            </motion.div>
          )}

          {/* Quick Add Button - Systems-Oriented: Conexión directa al carrito */}
          <motion.button
            onClick={handleAddToCart}
            disabled={!hasStock || isAdding}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            transition={{ duration: 0.2 }}
            className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-colors ${
              hasStock
                ? "bg-yerba-600 text-white hover:bg-yerba-700"
                : "bg-stone-300 text-stone-500 cursor-not-allowed"
            }`}
          >
            {isAdding ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 flex items-center justify-center"
              >
                <Check className="w-5 h-5" />
              </motion.div>
            ) : (
              <ShoppingCart className="w-5 h-5" />
            )}
          </motion.button>
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

            {/* Stock Indicator - Human-Core: Pulso sutil si hay stock */}
            {hasStock && (
              <div className="flex items-center gap-1.5">
                <motion.span
                  className="w-2 h-2 rounded-full bg-yerba-500"
                  animate={{
                    scale: isLowStock ? [1, 1.2, 1] : 1,
                    opacity: isLowStock ? [1, 0.7, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
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
    </motion.article>
  );
}
