import { ReactNode } from "react";
import { MercadoPagoInit } from "@/components/checkout/mercado-pago-init";

// Inicializa el SDK de MercadoPago solo para el segment /checkout/*.
// Mantener el init acá (y no en el layout raíz) evita cargar el SDK ~80KB
// en home, /productos y el resto del sitio donde no se paga.
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MercadoPagoInit />
      {children}
    </>
  );
}
