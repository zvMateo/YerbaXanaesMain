"use client";

import { MercadoPagoLogo } from "@/components/checkout/mercado-pago-logo";

/**
 * Brand Brick — muestra los medios de pago aceptados con la marca Mercado Pago.
 * Se usa en la página de producto y en el carrito para generar confianza antes
 * de que el usuario llegue al checkout.
 */

interface BrandBrickProps {
  /** Variante compacta para el carrito; full para la página de producto */
  variant?: "compact" | "full";
}

export function BrandBrick({ variant = "full" }: BrandBrickProps) {
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
        <span>Pagá con</span>
        <span className="flex items-center gap-2">
          <MercadoPagoLogo
            variant="horizontal"
            className="h-6 w-auto max-w-24 object-contain"
          />
        </span>
        <span>tarjeta, billetera o efectivo</span>
      </div>
    );
  }

  return (
    <div className="border border-stone-100 rounded-xl p-4 bg-stone-50 space-y-4">
      {/* Mercado Pago */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MercadoPagoLogo variant="horizontal" className="h-6 w-auto" />
          <span className="text-sm text-stone-600 font-medium">
            Mercado Pago
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentBadge label="Tarjeta de crédito" icon="💳" />
          <PaymentBadge label="Tarjeta de débito" icon="💳" />
          <PaymentBadge label="Dinero en cuenta" icon="🏦" />
          <PaymentBadge label="Rapipago" icon="🧾" />
          <PaymentBadge label="Pago Fácil" icon="🧾" />
        </div>
      </div>

      <p className="text-xs text-stone-400">
        Pago seguro y encriptado · Sin salir del sitio
      </p>
    </div>
  );
}

function PaymentBadge({ label, icon }: { label: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-full px-2 py-0.5 text-xs text-stone-600">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
