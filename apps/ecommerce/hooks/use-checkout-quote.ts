"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Espejo de la respuesta de `POST /checkout/quote`. */
export interface CheckoutQuote {
  itemsSubtotal: number;
  shippingCost: number;
  shippingProvider: "correo_argentino" | "pickup" | "manual_quote_required";
  freeShippingApplied: boolean;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  total: number;
}

export interface QuoteInput {
  orderItems: { variantId: string; quantity: number }[];
  deliveryType: "shipping" | "pickup";
  shippingDeliveryType?: "D" | "S";
  shippingZip?: string;
  shippingProductName?: string;
  couponCode?: string;
}

/**
 * Cotización autoritativa del carrito. El checkout muestra estos números; no
 * los recalcula. Antes cada pantalla sumaba por su cuenta y el total del
 * resumen podía no coincidir con el que el server terminaba cobrando.
 *
 * Pasar `null` deshabilita la consulta (carrito vacío).
 */
export function useCheckoutQuote(input: QuoteInput | null) {
  return useQuery<CheckoutQuote>({
    queryKey: ["checkout-quote", input],
    enabled: input !== null && input.orderItems.length > 0,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/checkout/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "No se pudo cotizar el pedido");
      }
      const json = await res.json();
      return json.data as CheckoutQuote;
    },
  });
}
