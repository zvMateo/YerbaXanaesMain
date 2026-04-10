"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";

interface CheckoutSuccessCleanupProps {
  shouldClearCart: boolean;
}

const CHECKOUT_STORAGE_KEY = "yerbaxanaes-checkout-data";
const CHECKOUT_STEP_KEY = "yerbaxanaes-checkout-step";

export function CheckoutSuccessCleanup({
  shouldClearCart,
}: CheckoutSuccessCleanupProps) {
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (!shouldClearCart) return;

    clearCart();
    localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_STEP_KEY);
  }, [shouldClearCart, clearCart]);

  return null;
}
