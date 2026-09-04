"use client";

import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Product, ProductVariant } from "@repo/types";
import { sortVariantsBySize } from "@/lib/variant-order";
import {
  ShoppingCart,
  Check,
  Minus,
  Plus,
  AlertCircle,
  Package,
  Truck,
  Leaf,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { BrandBrick } from "@/components/checkout/brand-brick";
import { brand } from "@/lib/brand";

interface ProductDetailProps {
  product: Product;
}

// Human-Core: Galería con zoom orgánico
function ImageGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion() === true;
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [-18, 18]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  // Placeholder si no hay imágenes
  const displayImages = images.length > 0 ? images : [null];

  return (
    <div className="space-y-4">
      {/* Main Image - Human-Core: Zoom suave */}
      <div
        ref={frameRef}
        className="relative aspect-square bg-stone-100 rounded-2xl overflow-hidden cursor-zoom-in group"
        onMouseEnter={() => {
          if (!reduceMotion) setIsZoomed(true);
        }}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {displayImages[selectedImage] ? (
          <motion.div
            className="w-full h-full"
            animate={{
              scale: !reduceMotion && isZoomed ? 1.5 : 1,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: "easeOut" }}
            style={
              reduceMotion
                ? { transformOrigin: `${mousePosition.x}% ${mousePosition.y}%` }
                : {
                    y: imageY,
                    transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                  }
            }
          >
            <Image
              src={displayImages[selectedImage]}
              alt={productName}
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-palm">
            <Leaf className="h-24 w-24" aria-hidden="true" />
          </div>
        )}

        {/* Zoom Indicator */}
        <AnimatePresence>
          {isZoomed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-stone-600"
            >
              Zoom activo
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Thumbnails - Generative UI: Navegación intuitiva */}
      {displayImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`relative h-14 w-14 min-h-11 min-w-11 sm:h-20 sm:w-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                selectedImage === index
                  ? "ring-2 ring-yerba-600 ring-offset-2"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {image ? (
                <Image
                  src={image}
                  alt={`${productName} - Vista ${index + 1}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-palm">
                  <Leaf className="h-6 w-6" aria-hidden="true" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Generative UI: Selector de variantes adaptativo
function VariantSelector({
  variants,
  selectedVariant,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onSelect: (variant: ProductVariant) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">
          Seleccioná el tamaño
        </span>
        {selectedVariant.isVirtualStock && (
          <span className="text-xs text-yerba-600 flex items-center gap-1">
            <Package className="h-3 w-3" />
            Stock calculado
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {sortVariantsBySize(variants).map((variant) => {
          const isSelected = selectedVariant.id === variant.id;
          const hasStock = variant.stock > 0;
          const isLowStock = variant.stock > 0 && variant.stock < 5;

          return (
            <motion.button
              key={variant.id}
              onClick={() => hasStock && onSelect(variant)}
              disabled={!hasStock}
              whileHover={hasStock ? { scale: 1.02 } : {}}
              whileTap={hasStock ? { scale: 0.98 } : {}}
              className={`relative min-h-11 px-5 py-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-yerba-600 bg-yerba-50 text-yerba-800"
                  : hasStock
                    ? "border-stone-200 bg-white text-stone-700 hover:border-yerba-300"
                    : "border-stone-100 bg-stone-50 text-stone-400 cursor-not-allowed"
              }`}
            >
              <div className="text-sm font-medium">{variant.name}</div>
              <div className="text-xs opacity-80">
                ${variant.price.toLocaleString()}
              </div>

              {/* Stock Indicator - Human-Core: Estado vivo */}
              {hasStock && isLowStock && (
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-earth-500 rounded-full"
                />
              )}

              {!hasStock && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                  <span className="text-xs font-medium text-stone-500">
                    Sin stock
                  </span>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Stock Info - Generative UI: Contexto de disponibilidad */}
      {selectedVariant.stock > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm"
        >
          <motion.span
            animate={
              selectedVariant.stock < 5
                ? { scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-2 h-2 rounded-full ${
              selectedVariant.stock < 5 ? "bg-earth-500" : "bg-yerba-500"
            }`}
          />
          <span className="text-shadow/70">
            {selectedVariant.stock} unidades disponibles
          </span>
        </motion.div>
      )}
    </div>
  );
}

// Systems-Oriented: Sección de agregar al carrito
function AddToCartSection({
  product,
  variant,
}: {
  product: Product;
  variant: ProductVariant;
}) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem, removeItem, updateQuantity } = useCartStore();

  const handleAddToCart = () => {
    if (variant.stock === 0) {
      toast.error("Producto sin stock");
      return;
    }

    if (quantity > variant.stock) {
      toast.error(`Solo hay ${variant.stock} unidades disponibles`);
      return;
    }

    // Human-Core: Feedback táctil inmediato
    setIsAdding(true);

    try {
      // Systems-Oriented: Agregar al store global
      const existing = useCartStore
        .getState()
        .items.find((item) => item.variantId === variant.id);
      const prevQty = existing?.quantity ?? 0;
      const prevId = existing?.id;

      addItem(product, variant, quantity);

      const added = useCartStore
        .getState()
        .items.find((item) => item.variantId === variant.id);

      setTimeout(() => {
        setIsAdding(false);
        toast.success(`${product.name} agregado`, {
          description: `${variant.name} x${quantity} = $${(variant.price * quantity).toLocaleString()}`,
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
      toast.error(error instanceof Error ? error.message : "Error al agregar");
    }
  };

  const maxQuantity = Math.min(10, variant.stock);

  return (
    <div className="space-y-4">
      {/* Quantity Selector - Human-Core: Controles intuitivos */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-stone-700">Cantidad</span>
        <div className="flex items-center border border-stone-200 rounded-full">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="inline-flex h-11 w-11 items-center justify-center text-shadow/70 hover:text-palm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-medium text-stone-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="inline-flex h-11 w-11 items-center justify-center text-shadow/70 hover:text-palm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Price Display - Generative UI: Precio total actualizado */}
      <div className="bg-yerba-50 rounded-xl p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-600">Total</span>

          <motion.span
            key={variant.price * quantity}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl font-bold text-yerba-700"
          >
            ${(variant.price * quantity).toLocaleString()}
          </motion.span>
        </div>
        <div className="text-xs text-stone-500 mt-1">
          {variant.price.toLocaleString()} c/u
        </div>
      </div>

      {/* Add to Cart Button - Human-Core: Micro-interacción */}
      <motion.button
        onClick={handleAddToCart}
        disabled={variant.stock === 0 || isAdding}
        whileHover={{ scale: variant.stock > 0 ? 1.02 : 1 }}
        whileTap={{ scale: variant.stock > 0 ? 0.98 : 1 }}
        className={`hidden lg:flex w-full min-h-12 py-4 rounded-full font-semibold text-lg items-center justify-center gap-2 transition-all ${
          variant.stock === 0
            ? "bg-stone-200 text-stone-400 cursor-not-allowed"
            : isAdding
              ? "bg-terra text-shadow"
              : "bg-terra text-shadow hover:bg-terra/90 shadow-lg hover:shadow-xl"
        }`}
      >
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="flex items-center gap-2"
            >
              <Check className="h-5 w-5" />
              ¡Agregado!
            </motion.span>
          ) : variant.stock === 0 ? (
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Sin stock
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Agregar al carrito
            </span>
          )}
        </AnimatePresence>
      </motion.button>

      <div className="space-y-3 rounded-xl border border-border bg-cream/50 p-4 text-sm text-shadow/80">
        <p className="font-medium text-shadow">Cómo lo recibís</p>
        <p>
          Retiro en {brand.locationLabel}.{" "}
          <Link href="/envios" className="font-semibold text-palm underline-offset-2 hover:underline">
            Ver envíos y retiro
          </Link>
        </p>
        <p>
          Envío a todo el país con Correo Argentino; el costo se cotiza en el
          checkout. Si no hay tarifa, coordinamos por WhatsApp.
        </p>
        <p>
          Envío gratis desde $
          {brand.freeShippingFromArs.toLocaleString("es-AR")}.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-cream/95 px-4 py-3 backdrop-blur lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0">
            <p className="font-serif text-xl font-bold text-shadow">
              ${(variant.price * quantity).toLocaleString("es-AR")}
            </p>
            <p className="text-xs text-shadow/60">{variant.name}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={variant.stock === 0 || isAdding}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 font-semibold ${
              variant.stock === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-terra text-shadow"
            }`}
          >
            {isAdding ? (
              <>
                <Check className="h-5 w-5" />
                Agregado
              </>
            ) : variant.stock === 0 ? (
              "Sin stock"
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                Agregar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tabs - Agents-Ready: Información estructurada
function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<
    "description" | "details" | "shipping"
  >("description");

  const tabs = [
    { id: "description", label: "Descripción" },
    { id: "details", label: "Detalles" },
    { id: "shipping", label: "Envío" },
  ] as const;

  return (
    <div className="mt-8">
      {/* Tab Buttons */}
      <div className="flex gap-4 overflow-x-auto border-b border-border sm:gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex min-h-11 items-center pb-3 text-sm font-medium transition-colors relative shrink-0 ${
              activeTab === tab.id
                ? "text-yerba-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-yerba-600"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - Generative UI: Contenido contextual */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="py-6 text-stone-600 leading-relaxed"
        >
          {activeTab === "description" && (
            <div className="prose prose-stone max-w-none">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p>Sin descripción adicional para este producto.</p>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-50 p-4 rounded-lg">
                  <span className="text-sm text-stone-500">Categoría</span>
                  <p className="font-medium text-stone-900">
                    {product.category?.name}
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg">
                  <span className="text-sm text-stone-500">SKU</span>
                  <p className="font-medium text-stone-900">{product.slug}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg">
                  <span className="text-sm text-stone-500">Estado</span>
                  <p className="font-medium text-yerba-600">
                    {product.isActive ? "Disponible" : "No disponible"}
                  </p>
                </div>
                <div className="bg-stone-50 p-4 rounded-lg">
                  <span className="text-sm text-stone-500">Variantes</span>
                  <p className="font-medium text-stone-900">
                    {product.variants?.length || 0} opciones
                  </p>
                </div>
              </div>

              {/* Variantes con receta */}
              {product.variants?.some(
                (v) => v.ingredients && v.ingredients.length > 0,
              ) && (
                <div className="mt-6 p-4 bg-yerba-50 rounded-lg border border-yerba-100">
                  <h4 className="font-medium text-yerba-800 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Stock Calculado
                  </h4>
                  <p className="text-sm text-yerba-700">
                    Este producto se elabora bajo pedido utilizando materia
                    prima fresca. El stock mostrado es el máximo que podemos
                    preparar con nuestra disponibilidad actual.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-palm mt-0.5" />
                <div>
                  <h4 className="font-medium text-shadow">
                    Envío a todo el país
                  </h4>
                  <p className="text-sm mt-1">
                    Cotizamos con Correo Argentino en el checkout, según tu
                    código postal y el peso del pedido. El plazo lo informa
                    Correo.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-palm mt-0.5" />
                <div>
                  <h4 className="font-medium text-shadow">Retiro en origen</h4>
                  <p className="text-sm mt-1">
                    {brand.locationLabel}. Coordinamos el retiro al confirmar el
                    pago.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-palm mt-0.5" />
                <div>
                  <h4 className="font-medium text-shadow">Envío gratis</h4>
                  <p className="text-sm mt-1">
                    En compras desde $
                    {brand.freeShippingFromArs.toLocaleString("es-AR")} el envío
                    puede no tener cargo — se confirma en el checkout.
                  </p>
                </div>
              </div>
              <Link
                href="/envios"
                className="inline-flex min-h-11 items-center font-semibold text-palm"
              >
                Más sobre envíos
              </Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Main Component - Human-Core: Experiencia completa
export function ProductDetail({ product }: ProductDetailProps) {
  // Sin `!`: si el producto no tiene variantes esto es undefined de verdad, y
  // el guard de abajo lo cubre. La asercion anterior mentia sobre el tipo.
  const [selectedVariant, setSelectedVariant] = useState<
    ProductVariant | undefined
  >(product.variants?.find((v) => v.stock > 0) ?? product.variants?.[0]);

  if (!product.variants || product.variants.length === 0 || !selectedVariant) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-stone-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-stone-900">
          Producto no disponible
        </h2>
        <p className="text-stone-500 mt-2">
          Este producto no tiene variantes disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16 pb-24 lg:pb-0">
      {/* Left Column - Images */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ImageGallery images={product.images} productName={product.name} />
      </div>

      {/* Right Column - Info */}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/productos?category=${product.category?.slug}`}
            className="inline-flex min-h-11 items-center text-sm text-palm font-medium hover:underline"
          >
            {product.category?.name}
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-shadow mt-2">
            {product.name}
          </h1>
        </div>

        {/* Short Description */}
        {product.description ? (
          <p className="text-shadow/80 leading-relaxed">{product.description}</p>
        ) : null}

        {/* Divider */}
        <div className="border-t border-stone-200" />

        {/* Variant Selector - Generative UI */}
        <VariantSelector
          variants={product.variants}
          selectedVariant={selectedVariant}
          onSelect={setSelectedVariant}
        />

        {/* Divider */}
        <div className="border-t border-stone-200" />

        {/* Add to Cart - Systems-Oriented */}
        <AddToCartSection product={product} variant={selectedVariant} />

        {/* Brand Brick - Medios de pago aceptados */}
        <BrandBrick variant="full" />

        {/* Tabs - Agents-Ready */}
        <ProductTabs product={product} />
      </div>
    </div>
  );
}
