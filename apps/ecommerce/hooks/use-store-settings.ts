"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Espejo de `GET /settings/public`. Sin datos internos del negocio. */
export interface PublicStoreSettings {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  shippingEnabled: boolean;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  paymentMercadoPago: boolean;
  paymentCash: boolean;
  paymentTransfer: boolean;
}

/**
 * Configuración que la clienta controla desde el panel: qué medios de pago
 * están activos y desde qué monto el envío es gratis.
 *
 * Mientras no resuelve, quien la consume no debe prometer nada: el carrito no
 * dibuja la barra de envío gratis. Los medios de pago sí se muestran, porque
 * el server los valida igual antes de cobrar.
 */
export function useStoreSettings() {
  return useQuery<PublicStoreSettings>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/settings/public`);
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      const json = await res.json();
      return json.data as PublicStoreSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
