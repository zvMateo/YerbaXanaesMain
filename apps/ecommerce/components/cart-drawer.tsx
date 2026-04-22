"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Package,
} from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import Link from "next/link";
import Image from "next/image";
import { BrandBrick } from "@/components/checkout/brand-brick";

// Human-Core: Item del carrito con micro-interacciones
interface CartItemProps {
  item: {
    id: string;
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    price: number;
    quantity: number;
    image?: string;
    stock: number;
  };
  index: number;
}

function CartItem({ item, index }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    // Animación antes de eliminar
    setTimeout(() => {
      removeItem(item.id);
    }, 300);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{
        opacity: isRemoving ? 0 : 1,
        x: isRemoving ? -100 : 0,
      }}
      exit={{ opacity: 0, x: -100 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="flex gap-4 p-4 bg-white rounded-xl border border-stone-100"
    >
      {/* Image */}
      <div className="relative w-20 h-20 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.productName}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl">🧉</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-stone-900 truncate">
          {item.productName}
        </h3>
        <p className="text-sm text-stone-500">{item.variantName}</p>

        {/* Stock warning - Generative UI */}
        {item.stock < 5 && item.stock > 0 && (
          <p className="text-xs text-earth-600 mt-1">
            ¡Solo {item.stock} disponibles!
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          {/* Quantity Controls - Human-Core: Feedback táctil */}
          <div className="flex items-center border border-stone-200 rounded-full">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-yerba-600 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </motion.button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.quantity < item.stock) {
                  updateQuantity(item.id, item.quantity + 1);
                }
              }}
              disabled={item.quantity >= item.stock}
              className="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-yerba-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3 w-3" />
            </motion.button>
          </div>

          {/* Price */}
          <span className="font-semibold text-stone-900">
            ${(Number(item.price) * item.quantity).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Remove Button */}
      <motion.button
        whileHover={{ scale: 1.1, color: "#dc2626" }}
        whileTap={{ scale: 0.9 }}
        onClick={handleRemove}
        className="text-stone-400 hover:text-red-600 transition-colors p-1"
        aria-label="Eliminar item"
      >
        <Trash2 className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}

// Human-Core: Empty state ilustrado
function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-32 h-32 bg-yerba-100 rounded-full flex items-center justify-center mb-6"
      >
        <ShoppingBag className="h-14 w-14 text-yerba-600" />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-serif text-xl font-semibold text-stone-900 mb-2"
      >
        Tu carrito está vacío
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-stone-600 mb-8"
      >
        Descubrí nuestra selección de yerba mate premium y encontrá tu favorita
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link
          href="/productos"
          onClick={onClose}
          className="inline-flex items-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-yerba-700 transition-colors"
        >
          Ver productos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  );
}

// Systems-Oriented: Free shipping progress bar
function FreeShippingProgress({
  current,
  threshold,
}: {
  current: number;
  threshold: number;
}) {
  const percentage = Math.min((current / threshold) * 100, 100);
  const remaining = Math.max(threshold - current, 0);
  const isReached = current >= threshold;

  return (
    <div className="bg-yerba-50 rounded-xl p-4">
      {isReached ? (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-3 text-yerba-700"
        >
          <div className="w-10 h-10 bg-yerba-100 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-yerba-600" />
          </div>
          <div>
            <p className="font-medium">¡Tenés envío gratis!</p>
            <p className="text-sm opacity-80">Tu compra llega sin costo</p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-stone-600">Te faltan</span>
            <span className="font-semibold text-yerba-700">
              ${remaining.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-stone-500 mb-3">
            para obtener envío gratis
          </p>

          {/* Progress Bar - Human-Core: Animación fluida */}
          <div className="h-2 bg-yerba-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-yerba-600 rounded-full"
            />
          </div>
        </>
      )}
    </div>
  );
}

// Main Drawer Component
export function CartDrawer() {
  const { items, isOpen, closeCart, freeShippingThreshold } = useCartStore();

  // Evita setState en effect para detectar hidratación cliente
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeCart]);

  if (!isHydrated) return null;

  return (
    <>
      {/* Backdrop - Human-Core: Fade suave */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer - Human-Core: Slide con resorte natural */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-stone-50 shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-stone-200">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-6 w-6 text-yerba-600" />
                <h2 className="font-serif text-xl font-semibold text-stone-900">
                  Tu Carrito
                </h2>
                {itemCount > 0 && (
                  <span className="bg-yerba-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {itemCount}
                  </span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={closeCart}
                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Cerrar carrito"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <EmptyCart onClose={closeCart} />
              ) : (
                <div className="p-4 space-y-4">
                  {/* Free Shipping Progress - Generative UI */}
                  <FreeShippingProgress
                    current={total}
                    threshold={freeShippingThreshold}
                  />

                  {/* Cart Items */}
                  <AnimatePresence mode="popLayout">
                    {items.map((item, index) => (
                      <CartItem key={item.id} item={item} index={index} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer - Systems-Oriented: Checkout directo */}
            {items.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-t border-stone-200 p-6 space-y-4"
              >
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Subtotal</span>
                  <span className="font-serif text-2xl font-bold text-stone-900">
                    ${total.toLocaleString()}
                  </span>
                </div>

                {/* Brand Brick compacto */}
                <BrandBrick variant="compact" />

                <p className="text-xs text-stone-500">
                  Envío y descuentos calculados en el checkout
                </p>

                {/* Checkout Button */}
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full bg-yerba-600 text-white py-4 rounded-full font-semibold text-lg flex items-center justify-center gap-2 hover:bg-yerba-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Finalizar compra
                  <ArrowRight className="h-5 w-5" />
                </Link>

                {/* Continue Shopping */}
                <button
                  onClick={closeCart}
                  className="w-full text-stone-600 hover:text-yerba-600 font-medium transition-colors"
                >
                  Seguir comprando
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
