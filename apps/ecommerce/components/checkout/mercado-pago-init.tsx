"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";

// Inicialización del SDK de MercadoPago a nivel de módulo.
// Este módulo se importa SOLO desde app/checkout/layout.tsx, por lo que el SDK
// (~80KB, render-blocking) queda en el chunk del segment /checkout y NO en el
// bundle del layout raíz que comparten todas las páginas (home, /productos, etc.).
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

if (typeof window !== "undefined" && MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "es-AR" });
}

/**
 * Componente sin render que garantiza que el SDK de MercadoPago quede inicializado
 * para todo el árbol de /checkout/* (Payment Brick, StatusScreen Brick).
 */
export function MercadoPagoInit() {
  return null;
}
