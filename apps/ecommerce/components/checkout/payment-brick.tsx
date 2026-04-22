"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Payment, usePaymentBrick } from "@mercadopago/sdk-react";
import { useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { ApiEnvelope, BrickPaymentResult } from "@repo/types";

type BrickSelectedPaymentMethod =
  | "credit_card"
  | "debit_card"
  | "prepaid_card"
  | "ticket"
  | "account_money"
  | "wallet_purchase"
  | "bank_transfer"
  | "atm";

interface PaymentBrickProps {
  /** Monto final (items + envío - descuento cupón) */
  amount: number;
  onSuccess?: (data: { orderId: string; status: string }) => void;
  onError?: (error: Error) => void;
  /** Callback para editar datos de envío desde el review step del Brick */
  onGoToDelivery?: () => void;
}

/** Payload que devuelve el brick en su callback onSubmit */
interface BrickFormData {
  token?: string;
  issuer_id?: string | number;
  payment_method_id: string;
  transaction_amount: number;
  installments?: number;
  payer: {
    email?: string;
    identification?: { type: string; number: string };
  };
}

interface BrickInitialization {
  amount: number;
  payer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    address?: {
      zipCode?: string;
      federalUnit?: string;
      city?: string;
      streetName?: string;
      streetNumber?: string;
      complement?: string;
    };
  };
}

interface BrickSdkError {
  message?: string;
  cause?: {
    message?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Mapea códigos de error de MP a mensajes en español comprensibles */
function mapMpErrorToSpanish(raw: string): string {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "Fondos insuficientes en la tarjeta",
    cc_rejected_bad_filled_card_number: "Número de tarjeta incorrecto",
    cc_rejected_bad_filled_date: "Fecha de vencimiento incorrecta",
    cc_rejected_bad_filled_security_code:
      "Código de seguridad (CVV) incorrecto",
    cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta",
    cc_rejected_call_for_authorize:
      "Comunicate con tu banco para autorizar el pago",
    cc_rejected_card_disabled: "La tarjeta está deshabilitada",
    cc_rejected_duplicated_payment: "Este pago ya fue procesado anteriormente",
    cc_rejected_high_risk:
      "El pago fue rechazado por seguridad. Probá con otra tarjeta",
    cc_rejected_max_attempts:
      "Superaste el límite de intentos. Probá más tarde",
    cc_rejected_other_reason:
      "El banco rechazó el pago. Comunicate con tu banco",
    pending_review_manual: "El pago está en revisión. Te avisamos por email",
    pending_contingency: "El pago está siendo procesado. Te avisamos por email",
  };

  for (const [code, message] of Object.entries(map)) {
    if (raw.toLowerCase().includes(code)) return message;
  }

  return raw || "Revisá los datos e intentá de nuevo";
}

function splitFullName(fullName: string): {
  firstName?: string;
  lastName?: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  const [firstName, ...rest] = parts;

  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(" ") : undefined,
  };
}

function normalizeMpErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const typedError = error as BrickSdkError;
    if (typedError.message) return typedError.message;
    if (typedError.cause?.message) return typedError.cause.message;
  }

  return "Error al inicializar el formulario de pago";
}

function createCorrelationId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function PaymentBrick({
  amount,
  onSuccess,
  onError,
  onGoToDelivery,
}: PaymentBrickProps) {
  const router = useRouter();
  const { getValues } = useFormContext<CheckoutFormData>();
  const { items, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBrickReady, setIsBrickReady] = useState(false);
  const currentBinRef = useRef<string | null>(null);
  const { update } = usePaymentBrick();

  // Estado de inicialización: crea orden + preferencia para habilitar Wallet y Cuotas
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [brickOrderId, setBrickOrderId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const {
    customerName,
    customerEmail,
    address,
    city,
    shippingProvinceCode,
    zipCode,
    deliveryType,
    shippingCost,
    shippingProvider,
    couponCode,
    couponDiscount,
    customerPhone,
  } = getValues();

  const payerInitialization: BrickInitialization["payer"] = {
    email: customerEmail,
    ...splitFullName(customerName),
    ...(address || city || zipCode || shippingProvinceCode
      ? {
          address: {
            zipCode: zipCode || undefined,
            federalUnit: shippingProvinceCode || undefined,
            city: city || undefined,
            streetName: address || undefined,
          },
        }
      : {}),
  };

  // Items para el review step — estabilizado con useMemo para evitar loops en useEffect
  const totalItemsAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const brickItems = useMemo(
    () => ({
      totalItemsAmount,
      itemsList: items.map((item) => ({
        units: item.quantity,
        value: item.price,
        name: item.productName,
        description: item.variantName || undefined,
        imageURL: item.image || undefined,
      })),
    }),
    [items, totalItemsAmount],
  );

  // Envío para el review step (solo si es entrega a domicilio)
  const brickShipping = useMemo(
    () =>
      deliveryType === "shipping" && (address || city || zipCode)
        ? {
            costs: shippingCost ?? 0,
            shippingMode: "custom",
            description: shippingProvider || "Envío a domicilio",
            receiverAddress: {
              streetName: address || "",
              streetNumber: "",
              zipCode: zipCode || "",
              city: city || "",
              federalUnit: shippingProvinceCode || "",
            },
          }
        : undefined,
    [deliveryType, address, city, zipCode, shippingCost, shippingProvider, shippingProvinceCode],
  );

  // Descuentos para el review step — también estabilizado con useMemo
  const brickDiscounts = useMemo(
    () =>
      couponDiscount && couponDiscount > 0
        ? {
            totalDiscountsAmount: couponDiscount,
            discountsList: [
              {
                name: couponCode ? `Cupón ${couponCode}` : "Descuento",
                value: couponDiscount,
              },
            ],
          }
        : undefined,
    [couponDiscount, couponCode],
  );

  // Brick-init: crea la orden PENDING + preferencia MP al entrar al paso de pago.
  // El preferenceId habilita "Mercado Pago Wallet" y "Cuotas sin Tarjeta" en el Brick.
  useEffect(() => {
    let cancelled = false;

    const initBrick = async () => {
      try {
        const res = await fetch(`${API_URL}/payments/brick-init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail,
            customerName,
            customerPhone: customerPhone || undefined,
            orderItems: items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
            deliveryType: deliveryType || undefined,
            shippingAddress: address || undefined,
            shippingCity: city || undefined,
            shippingProvinceCode: shippingProvinceCode || undefined,
            shippingZip: zipCode || undefined,
            shippingCost: shippingCost ?? 0,
            shippingProvider: shippingProvider || undefined,
            couponCode: couponCode || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error("Error al inicializar el pago");
        }

        const json = await res.json();
        if (!cancelled) {
          setPreferenceId(json.data.preferenceId);
          setBrickOrderId(json.data.orderId);
          setIsInitializing(false);
        }
      } catch {
        if (!cancelled) {
          setInitError(
            "No se pudo inicializar el pago. Por favor recargá la página.",
          );
          setIsInitializing(false);
        }
      }
    };

    void initBrick();
    return () => {
      cancelled = true;
    };
    // Solo ejecutar una vez al montar — los valores del form están fijos en este paso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar el Brick cuando cambia el monto, descuentos o envío
  // (ej: cupón aplicado post-render). useMemo en brickDiscounts/brickShipping
  // previene loops de re-render por referencias de objeto nuevas.
  useEffect(() => {
    if (!isBrickReady) return;
    update({
      amount,
      ...(brickDiscounts ? { discounts: brickDiscounts } : {}),
      ...(brickShipping ? { shipping: brickShipping } : {}),
    });
  }, [amount, brickDiscounts, brickShipping, isBrickReady, update]);

  const handleSubmit = async (
    selectedPaymentMethod: BrickSelectedPaymentMethod,
    formData: BrickFormData,
  ) => {
    // wallet_purchase / onboarding_credits: MP redirige al usuario a su cuenta.
    // La orden ya fue creada en brick-init con el preferenceId correcto.
    // El webhook de MP actualizará el estado cuando el usuario pague.
    // El back_url del preference lleva al usuario a /checkout/success con el orderId.
    if (selectedPaymentMethod === "wallet_purchase") {
      return; // El SDK de MP maneja el redirect — solo resolvemos el Promise
    }

    if (isProcessing) return;
    setIsProcessing(true);

    const correlationId = createCorrelationId();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

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

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_URL}/payments/brick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-Id": correlationId,
          "X-Checkout-Channel": "payment-brick",
        },
        body: JSON.stringify({
          selectedPaymentMethod,
          // Si brick-init ya creó la orden, la reutilizamos para evitar duplicados
          ...(brickOrderId ? { existingOrderId: brickOrderId } : {}),
          formData: {
            ...formData,
            // Asegurar que transaction_amount coincida con el amount inicializado
            transaction_amount: amount,
            payer: {
              email: formData.payer?.email ?? customerEmail,
              identification: formData.payer?.identification,
            },
            issuer_id:
              formData.issuer_id != null && String(formData.issuer_id) !== "0"
                ? String(formData.issuer_id)
                : undefined,
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response
        .json()
        .catch(() => ({}))) as ApiEnvelope<BrickPaymentResult> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          `[${correlationId}] ${data.message || "Error al procesar el pago"}`,
        );
      }

      const result = data.data;

      if (!result) {
        throw new Error("Respuesta inválida del servidor al procesar pago.");
      }

      const mpParam = result.mpPaymentId
        ? `&mpPaymentId=${encodeURIComponent(result.mpPaymentId)}`
        : "";

      if (result.status === "approved") {
        clearCart();
        toast.success("¡Pago aprobado!", {
          description: `Orden #${result.orderId.slice(0, 8).toUpperCase()} confirmada`,
        });
        if (onSuccess) {
          onSuccess({ orderId: result.orderId, status: result.status });
        } else {
          router.push(
            `/checkout/success?orderId=${result.orderId}${mpParam}&cid=${encodeURIComponent(correlationId)}`,
          );
        }
        return;
      }

      // Pago offline o en proceso (Rapipago, etc.)
      if (result.status === "pending" || result.status === "in_process") {
        clearCart();
        const hasTicker = Boolean(result.ticketUrl);
        toast.info(hasTicker ? "Comprobante generado" : "Pago en proceso", {
          description: hasTicker
            ? "Abrí el link para pagar en Rapipago o Pago Fácil"
            : "Te notificaremos cuando se confirme el pago",
        });
        router.push(
          `/checkout/success?orderId=${result.orderId}&status=pending${mpParam}${result.ticketUrl ? `&ticketUrl=${encodeURIComponent(result.ticketUrl)}` : ""}&cid=${encodeURIComponent(correlationId)}`,
        );
        return;
      }

      // Estado inesperado
      throw new Error("El pago no pudo completarse. Intentá de nuevo.");
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Error desconocido al procesar el pago");

      if (error.name === "AbortError") {
        error.message =
          "La operación tardó demasiado. Revisá tu conexión e intentá nuevamente.";
      }

      toast.error("Error en el pago", {
        description: mapMpErrorToSpanish(error.message),
      });
      if (onError) onError(error);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsProcessing(false);
    }
  };

  if (amount <= 0) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          El total debe ser mayor a $0 para continuar.
        </p>
      </div>
    );
  }

  // Error al crear la preferencia (brick-init falló)
  if (initError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
        <p className="text-sm font-medium text-red-700">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-red-600 underline underline-offset-2"
        >
          Recargar página
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 relative">
      {/* Overlay de procesamiento */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center rounded-xl z-10 gap-2">
          <Loader2 className="animate-spin w-6 h-6 text-yerba-600" />
          <span className="text-sm font-medium text-stone-700">
            Procesando pago...
          </span>
        </div>
      )}

      {/* Skeleton mientras carga brick-init o el SDK del Brick */}
      {(isInitializing || !isBrickReady) && (
        <div className="absolute inset-0 bg-white rounded-xl z-10 flex flex-col gap-4 p-6">
          <div className="h-5 w-1/3 bg-stone-100 animate-pulse rounded" />
          <div className="h-12 bg-stone-100 animate-pulse rounded-lg" />
          <div className="h-12 bg-stone-100 animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-stone-100 animate-pulse rounded-lg" />
            <div className="h-12 bg-stone-100 animate-pulse rounded-lg" />
          </div>
          <div className="h-12 bg-stone-100 animate-pulse rounded-lg" />
          <div className="h-12 bg-yerba-100 animate-pulse rounded-lg mt-2" />
        </div>
      )}

      {/* El Brick solo se monta una vez que brick-init devuelve el preferenceId */}
      {!isInitializing && preferenceId && (
      <Payment
        initialization={{
          amount,
          preferenceId,
          payer: payerInitialization,
          items: brickItems,
          ...(brickShipping ? { shipping: brickShipping } : {}),
          ...(brickDiscounts ? { discounts: brickDiscounts } : {}),
        }}
        customization={{
          visual: {
            style: {
              theme: "default",
              customVariables: {
                baseColor: "#365314",
                textPrimaryColor: "#292524",
                textSecondaryColor: "#57534e",
                buttonTextColor: "#fafaf9",
                borderRadiusMedium: "0.75rem",
                formBackgroundColor: "#ffffff",
                outlinePrimaryColor: "#84cc16",
              },
            },
            defaultPaymentOption: {
              creditCardForm: true,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            texts: {
              payerFirstName: {
                label: "Nombre",
                placeholder: "Tu nombre",
              },
              payerLastName: {
                label: "Apellido",
                placeholder: "Tu apellido",
              },
              zipCode: {
                label: "Código postal",
                placeholder: "Ej: 1000",
              },
              addressState: {
                label: "Provincia",
              },
              addressCity: {
                label: "Ciudad",
              },
              addressStreet: {
                label: "Calle",
              },
              addressNumber: {
                label: "Altura",
              },
              // reviewConfirm: soportado en runtime pero aún no tipado en el SDK
              reviewConfirm: {
                componentTitle: "Revisá tu compra",
                paymentMethodDetailsTitle: "Medio de pago",
                shippingDetailsTitle: "Datos de entrega",
                summaryItemsTitle: "Productos",
                summaryShippingTitle: "Envío",
                summaryDiscountTitle: "Descuento",
                summaryYouPayTitle: "Total a pagar",
              },
            } as Record<string, unknown>,
          },
          enableReviewStep: true,
          reviewCardsOrder: ["payment_method", "shipping"],
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            prepaidCard: "all",
            ticket: "all",
            mercadoPago: "all",
            minInstallments: 1,
            maxInstallments: 12,
          },
        }}
        locale="es-AR"
        onReady={() => setIsBrickReady(true)}
        onSubmit={async ({ selectedPaymentMethod, formData }) => {
          await handleSubmit(
            selectedPaymentMethod as BrickSelectedPaymentMethod,
            formData as BrickFormData,
          );
        }}
        onBinChange={(bin) => {
          const cleanedBin =
            typeof bin === "string" ? bin.replace(/\D/g, "") : "";
          currentBinRef.current =
            cleanedBin.length >= 6 ? cleanedBin.slice(0, 6) : null;
        }}
        onError={(error) => {
          const raw = normalizeMpErrorMessage(error);
          const detail = mapMpErrorToSpanish(raw);
          toast.error("Error en el pago", { description: detail });
          if (onError) {
            onError(new Error(detail));
          }
        }}
        onClickEditShippingData={onGoToDelivery}
        onRenderNextStep={() => {
          // El usuario avanzó al review step — scroll al top del brick
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onRenderPreviousStep={() => {
          // El usuario volvió al formulario de pago desde el review
        }}
      />
      )}
    </div>
  );
}
