"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";
import { clearCheckoutStorage } from "@/lib/checkout-storage";

interface CheckoutSuccessCleanupProps {
  shouldClearCart: boolean;
}

export function CheckoutSuccessCleanup({
  shouldClearCart,
}: CheckoutSuccessCleanupProps) {
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (!shouldClearCart) return;

    clearCart();
    clearCheckoutStorage();
  }, [shouldClearCart, clearCart]);

  return null;
}
