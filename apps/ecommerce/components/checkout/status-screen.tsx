"use client";

import { StatusScreen } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface StatusScreenBrickProps {
  mpPaymentId: string;
}

export function StatusScreenBrick({ mpPaymentId }: StatusScreenBrickProps) {
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {!isReady && (
        <div className="flex items-center justify-center gap-3 py-12 text-stone-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando estado del pago...</span>
        </div>
      )}

      <div className={isReady ? "block" : "hidden"}>
        <StatusScreen
          initialization={{ paymentId: mpPaymentId }}
          customization={{
            visual: {
              style: { theme: "default" },
              hideStatusDetails: false,
              hideTransactionDate: false,
            },
          }}
          onReady={() => setIsReady(true)}
          onError={() => {
            // Si falla el brick mostramos el estado custom — el padre controla esto
            setIsReady(true);
          }}
        />
      </div>
    </div>
  );
}
