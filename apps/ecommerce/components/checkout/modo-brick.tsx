"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Smartphone, RefreshCw, Clock } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";

interface ModoBrickProps {
  orderId: string;
  checkoutId: string;
  qrCode: string; // base64 PNG
  deeplink: string;
  expiresAt: string; // ISO string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const POLL_INTERVAL_MS = 3000;
const QR_DISPLAY_MINUTES = 10;

export function ModoBrick({
  orderId,
  qrCode,
  deeplink,
  expiresAt,
}: ModoBrickProps) {
  const router = useRouter();
  const { clearCart } = useCartStore();

  const [secondsLeft, setSecondsLeft] = useState(() => {
    const exp = new Date(expiresAt).getTime();
    return Math.max(0, Math.floor((exp - Date.now()) / 1000));
  });
  const [isExpired, setIsExpired] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      setIsExpired(true);
      return;
    }

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling del estado de la orden
  useEffect(() => {
    if (isExpired || isPaid) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/payments/order-status/${orderId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const payload = (await res.json()) as {
          data?: { status?: string };
        };
        const status = payload.data?.status;

        if (status === "PAID") {
          setIsPaid(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          clearCart();
          toast.success("¡Pago confirmado!", {
            description: "Tu orden fue procesada correctamente.",
          });
          router.push(`/checkout/success?orderId=${orderId}`);
        } else if (status === "CANCELLED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast.error("El pago fue cancelado o rechazado.");
          router.push(`/checkout/success?orderId=${orderId}&status=failure`);
        }
      } catch {
        // Fallo de red — continúa polling
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isExpired, isPaid, orderId, clearCart, router]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progressPercent =
    ((QR_DISPLAY_MINUTES * 60 - secondsLeft) / (QR_DISPLAY_MINUTES * 60)) *
    100;

  if (isPaid) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-yerba-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm font-medium">Pago confirmado, redirigiendo…</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="font-semibold text-stone-900">El código venció</h3>
        <p className="text-sm text-stone-600">
          El QR expiró. Volvé al paso anterior para generar uno nuevo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 text-sm text-yerba-600 hover:text-yerba-700 font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Recargar página
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#003399] px-6 py-4 flex items-center gap-3">
        <span className="text-white font-bold text-xl tracking-tight">MODO</span>
        <span className="text-blue-200 text-sm">· Pago seguro con tu banco</span>
      </div>

      <div className="p-6 space-y-6">
        {/* Instrucciones */}
        <div className="space-y-2">
          <p className="font-medium text-stone-900 text-sm">
            Cómo pagar con MODO:
          </p>
          <ol className="text-sm text-stone-600 space-y-1 list-decimal list-inside">
            <li>Abrí la app MODO o la app de tu banco</li>
            <li>Escaneá el código QR con la cámara</li>
            <li>Confirmá el pago dentro de la app</li>
          </ol>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-52 h-52 border-2 border-stone-200 rounded-xl overflow-hidden bg-white p-2">
            {qrCode ? (
              <Image
                src={`data:image/png;base64,${qrCode}`}
                alt="Código QR MODO"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            )}
          </div>

          {/* Countdown */}
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-stone-500">
              <span>El código vence en</span>
              <span
                className={`font-mono font-semibold ${secondsLeft < 60 ? "text-red-600" : "text-stone-700"}`}
              >
                {formatTime(secondsLeft)}
              </span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  secondsLeft < 60 ? "bg-red-500" : "bg-[#003399]"
                }`}
                style={{ width: `${100 - progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CTA Mobile — deeplink */}
        <a
          href={deeplink}
          className="flex items-center justify-center gap-2 w-full bg-[#003399] text-white py-3 rounded-full font-semibold text-sm hover:bg-blue-800 transition-colors"
        >
          <Smartphone className="w-4 h-4" />
          Pagar con la app MODO
        </a>

        {/* Polling indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Esperando confirmación del pago…
        </div>
      </div>
    </div>
  );
}
