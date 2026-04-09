"use client";

import { useState } from "react";
import { CardPayment } from "@mercadopago/sdk-react";
import { useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { CheckoutFormData } from "@/schemas/checkout-schema";

interface CardPaymentBrickProps {
  amount: number;
  onSuccess?: (data: { id: number; status: string; orderId: string }) => void;
  onError?: (error: Error) => void;
}

// Interfaz que refleja el payload de onSubmit() de CardPayment
interface CardPaymentSubmitData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: {
    email?: string;
    identification?: { type: string; number: string };
  };
  payment_method_option_id?: string;
  processing_mode?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function CardPaymentBrick({
  amount,
  onSuccess,
  onError,
}: CardPaymentBrickProps) {
  const router = useRouter();
  const { getValues } = useFormContext<CheckoutFormData>();
  const { items, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (cardData: CardPaymentSubmitData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const {
        customerName,
        customerEmail,
        customerPhone,
        deliveryType,
        address,
        city,
        shippingProvinceCode,
        zipCode,
        shippingCost,
        shippingProvider,
        couponCode,
      } = getValues();

      if (!cardData.token) {
        throw new Error(
          "No se pudo tokenizar la tarjeta. Verificá que el CVV esté completo.",
        );
      }

      // Llamada directa a nuestro backend NestJS
      const response = await fetch(`${API_URL}/payments/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_amount: amount,
          token: cardData.token,
          description: "Compra en YerbaXanaes",
          installments: cardData.installments ?? 1,
          payment_method_id: cardData.payment_method_id,
          // Si MP no envía issuer_id (como pasa con algunas débitos) u omite, no lo enviamos "0"
          ...(cardData.issuer_id != null && String(cardData.issuer_id) !== "0"
            ? { issuer_id: String(cardData.issuer_id) }
            : {}),
          payer: {
            email: cardData.payer?.email ?? customerEmail,
            identification: cardData.payer?.identification,
          },
          customerName,
          customerPhone,
          deliveryType,
          shippingAddress: address,
          shippingCity: city,
          shippingProvinceCode,
          shippingZip: zipCode,
          shippingCost: shippingCost ?? 0,
          shippingProvider,
          couponCode: couponCode || undefined,
          orderItems: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Error al procesar el pago");
      }

      if (data.status === "approved" || data.status === "processed") {
        clearCart();
        toast.success("¡Pago aprobado!", {
          description: `Orden #${(data.orderId as string).slice(0, 8).toUpperCase()} confirmada`,
        });
        if (onSuccess) {
          onSuccess(data);
        } else {
          router.push(`/checkout/success?orderId=${data.orderId}`);
        }
        return;
      }

      // Si quedó en revisión
      if (
        data.status === "in_process" ||
        data.status === "action_required" ||
        data.status === "pending"
      ) {
        clearCart();
        toast.info("Pago en proceso", {
          description:
            "Estamos verificando tu pago. Te notificaremos por email.",
        });
        router.push(
          `/checkout/success?orderId=${data.orderId ?? ""}&status=pending`,
        );
        return;
      }

      // Rechazo
      throw new Error(
        data.detail || "El pago fue rechazado. Revisá los datos de tu tarjeta.",
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido");
      toast.error("Error en el pago", { description: error.message });
      if (onError) onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (amount <= 0) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          El total del carrito debe ser mayor a $0 para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-stone-200 relative">
      {isProcessing && (
        <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center rounded-xl z-10 gap-2">
          <Loader2 className="animate-spin w-6 h-6 text-yerba-600" />
          <span className="text-sm font-medium text-stone-700">
            Procesando pago...
          </span>
        </div>
      )}

      <CardPayment
        initialization={{ amount }}
        customization={{
          visual: {
            style: { theme: "default" },
          },
          paymentMethods: {
            maxInstallments: 12,
          },
        }}
        onSubmit={handleSubmit}
        onError={(error) => {
          const detail =
            typeof error === "object" && error !== null && "message" in error
              ? (error as { message: string }).message
              : "Revisá los datos ingresados e intentá de nuevo";
          toast.error("Error en el formulario de pago", {
            description: detail,
          });
        }}
      />
    </div>
  );
}
