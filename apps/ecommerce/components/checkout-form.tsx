"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  checkoutSchemaValidated,
  CheckoutFormData,
} from "@/schemas/checkout-schema";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Tag, Check, X } from "lucide-react";
import dynamic from "next/dynamic";

import { useFormContext } from "react-hook-form";
import { PersonalInfoStep } from "./checkout-steps/personal-info-step";
import { DeliveryStep } from "./checkout-steps/delivery-step";
import { PaymentStep } from "./checkout-steps/payment-step";
import { OrderSummary } from "./checkout-steps/order-summary";

const PaymentBrick = dynamic(
  () =>
    import("@/components/checkout/payment-brick").then(
      (mod) => mod.PaymentBrick,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full bg-stone-100 animate-pulse rounded-xl flex items-center justify-center text-stone-400">
        Cargando formulario de pago...
      </div>
    ),
  },
);

const ModoBrick = dynamic(
  () =>
    import("@/components/checkout/modo-brick").then((mod) => mod.ModoBrick),
  { ssr: false, loading: () => null },
);

function CouponInput({ total }: { total: number }) {
  const { setValue, watch } = useFormContext<CheckoutFormData>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appliedCode = watch("couponCode");
  const discount = watch("couponDiscount") ?? 0;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), orderAmount: total }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Cupón inválido");
        return;
      }
      setValue("couponCode", code.trim().toUpperCase());
      setValue("couponDiscount", data.discountAmount);
      setCode("");
    } catch {
      setError("Error al validar el cupón");
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    setValue("couponCode", undefined);
    setValue("couponDiscount", 0);
    setError(null);
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between bg-yerba-50 border border-yerba-200 rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-yerba-600" />
          <span className="text-sm font-semibold text-yerba-700 font-mono">
            {appliedCode}
          </span>
          <span className="text-sm text-yerba-600">
            — ${discount.toLocaleString("es-AR")} de descuento
          </span>
        </div>
        <button
          type="button"
          onClick={remove}
          className="p-1 text-stone-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="¿Tenés un cupón?"
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:outline-none text-sm"
          />
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={loading || !code.trim()}
          className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Aplicar
        </button>
      </div>
      {error && <p className="text-red-600 text-xs mt-1.5 ml-1">{error}</p>}
    </div>
  );
}

const steps = [
  { id: "personal", label: "Tus Datos", number: 1 },
  { id: "delivery", label: "Entrega", number: 2 },
  { id: "payment", label: "Pago", number: 3 },
  { id: "summary", label: "Confirmar", number: 4 },
];

const CHECKOUT_STORAGE_KEY = "yerbaxanaes-checkout-data";
const CHECKOUT_STEP_KEY = "yerbaxanaes-checkout-step";

export function CheckoutForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingStock, setIsValidatingStock] = useState(false);
  const [stockErrors, setStockErrors] = useState<
    Array<{ product: string; message: string }>
  >([]);
  const [modoData, setModoData] = useState<{
    orderId: string;
    checkoutId: string;
    qrCode: string;
    deeplink: string;
    expiresAt: string;
  } | null>(null);

  const { items, clearCart } = useCartStore();
  const router = useRouter();

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.price);
      const qty = Number(item.quantity);
      if (isNaN(price) || isNaN(qty)) return sum;
      return sum + price * qty;
    }, 0);
  }, [items]);

  const methods = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchemaValidated),
    mode: "onChange",
    defaultValues: {
      deliveryType: "shipping",
      paymentMethod: "mercadopago",
      shippingCost: 0,
      shippingProvider: "pickup",
      shippingProvinceCode: "B",
    },
  });

  const { trigger, watch, reset, handleSubmit: hookFormHandleSubmit } = methods;

  // Restaurar datos del localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(CHECKOUT_STORAGE_KEY);
      const savedStep = localStorage.getItem(CHECKOUT_STEP_KEY);
      if (savedData) reset(JSON.parse(savedData));
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        if (step >= 0 && step < steps.length) setCurrentStep(step);
      }
    } catch {
      // Error no crítico — continúa sin datos guardados
    }
  }, [reset]);

  // Persistir datos en localStorage
  useEffect(() => {
    const subscription = watch((data) => {
      try {
        localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(CHECKOUT_STEP_KEY, currentStep.toString());
      } catch {
        // Error no crítico — continúa sin persistir
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, currentStep]);

  const clearStoredData = () => {
    localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_STEP_KEY);
  };

  const handleNext = async () => {
    let isStepValid = false;
    switch (currentStep) {
      case 0:
        isStepValid = await trigger([
          "customerName",
          "customerEmail",
          "customerPhone",
        ]);
        break;
      case 1:
        isStepValid = await trigger([
          "deliveryType",
          "address",
          "city",
          "zipCode",
        ]);
        break;
      case 2:
        isStepValid = await trigger(["paymentMethod"]);
        break;
      case 3:
        isStepValid = true;
        break;
    }
    if (isStepValid && currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setStockErrors([]);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setStockErrors([]);
    }
  };

  const validateStockBeforeSubmit = async (): Promise<boolean> => {
    setIsValidatingStock(true);
    setStockErrors([]);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/orders/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      if (!response.ok) throw new Error("Error al validar stock");
      const validation = await response.json();
      if (!validation.valid) {
        setStockErrors(validation.errors);
        toast.error("Stock insuficiente", {
          description: "Algunos productos no tienen el stock necesario",
        });
        return false;
      }
      return true;
    } catch {
      toast.error("No pudimos validar stock", {
        description:
          "Intentá de nuevo en unos segundos. No continuamos para evitar sobreventa.",
      });
      return false;
    } finally {
      setIsValidatingStock(false);
    }
  };

  // Submit para MODO: crea la intención de pago y muestra el QR
  const onSubmitModo = async (data: CheckoutFormData) => {
    const stockValid = await validateStockBeforeSubmit();
    if (!stockValid) return;

    setIsSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const response = await fetch(`${apiUrl}/payments/modo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          deliveryType: data.deliveryType,
          shippingAddress: data.address,
          shippingCity: data.city,
          shippingProvinceCode: data.shippingProvinceCode,
          shippingZip: data.zipCode,
          shippingCost: data.shippingCost ?? 0,
          shippingProvider: data.shippingProvider,
          couponCode: data.couponCode || undefined,
          installments: data.modoInstallments ?? 1,
          orderItems: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message || "Error al iniciar pago MODO",
        );
      }

      const result = (await response.json()) as {
        orderId: string;
        checkoutId: string;
        qrCode: string;
        deeplink: string;
        expiresAt: string;
      };

      setModoData(result);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error al conectar con MODO";
      toast.error("Error al iniciar pago MODO", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit solo para transferencia (el brick de MP maneja su propio submit)
  const onSubmit = async (data: CheckoutFormData) => {
    const stockValid = await validateStockBeforeSubmit();
    if (!stockValid) return;

    setIsSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          channel: "ONLINE",
          paymentMethod: "TRANSFER",
          deliveryType: data.deliveryType,
          shippingAddress: data.address,
          shippingCity: data.city,
          shippingProvinceCode: data.shippingProvinceCode,
          shippingZip: data.zipCode,
          shippingCost: data.shippingCost ?? 0,
          shippingProvider: data.shippingProvider,
          couponCode: data.couponCode || undefined,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message || "Error al crear orden",
        );
      }

      const order = await response.json();
      clearStoredData();
      clearCart();
      toast.success("¡Orden creada!", {
        description: "Nos pondremos en contacto para coordinar el pago",
      });
      router.push(`/checkout/success?orderId=${(order as { id: string }).id}`);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error al procesar la orden";
      toast.error("Error al procesar", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">
          Tu carrito está vacío
        </h2>
        <button
          onClick={() => router.push("/productos")}
          className="bg-yerba-600 text-white px-6 py-3 rounded-full mt-4"
        >
          Ver Productos
        </button>
      </div>
    );
  }

  const selectedPaymentMethod = watch("paymentMethod");
  const shippingCost = watch("shippingCost") ?? 0;
  const couponDiscount = watch("couponDiscount") ?? 0;
  // Monto final para el Payment Brick: items + envío - descuento
  const brickAmount = Math.max(0, total + shippingCost - couponDiscount);

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        {/* Errores de stock */}
        {stockErrors.length > 0 && (
          <div className="mb-6 bg-red-50 p-4 rounded-xl border border-red-200">
            <div className="flex gap-3">
              <AlertTriangle className="text-red-600 w-5 h-5 shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900">
                  Stock insuficiente
                </h3>
                {stockErrors.map((e, i) => (
                  <p key={i} className="text-sm text-red-700">
                    • {e.product}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Indicador de pasos */}
        <div className="mb-8 flex justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  index <= currentStep ? "bg-yerba-600" : "bg-stone-200"
                }`}
              >
                {index < currentStep ? "✓" : step.number}
              </div>
              <span className="text-xs mt-2">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && <PersonalInfoStep />}
              {currentStep === 1 && <DeliveryStep />}
              {currentStep === 2 && <PaymentStep />}
              {currentStep === 3 && (
                <>
                  <CouponInput total={total} />
                  <OrderSummary items={items} total={total} />

                  {/* Payment Brick: Mercado Pago */}
                  {selectedPaymentMethod === "mercadopago" && (
                    <div className="mt-6">
                      <h3 className="text-base font-semibold text-stone-900 mb-3">
                        Completá tu pago
                      </h3>
                      <PaymentBrick
                        amount={brickAmount}
                        onGoToDelivery={() => setCurrentStep(1)}
                        onSuccess={({ orderId }) => {
                          clearStoredData();
                          clearCart();
                          router.push(
                            `/checkout/success?orderId=${orderId}`,
                          );
                        }}
                        onError={(err) =>
                          toast.error("Error en el pago", {
                            description: err.message,
                          })
                        }
                      />
                    </div>
                  )}

                  {/* MODO: QR + deeplink */}
                  {selectedPaymentMethod === "modo" && modoData && (
                    <div className="mt-6">
                      <ModoBrick
                        orderId={modoData.orderId}
                        checkoutId={modoData.checkoutId}
                        qrCode={modoData.qrCode}
                        deeplink={modoData.deeplink}
                        expiresAt={modoData.expiresAt}
                      />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Botones de navegación */}
          <div className="flex justify-between mt-8 pt-6 border-t border-stone-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              className="px-6 py-3 text-stone-600 disabled:opacity-50"
            >
              {currentStep === 0 ? "Cancelar" : "Volver"}
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-yerba-600 text-white rounded-full hover:bg-yerba-700"
              >
                Continuar
              </button>
            ) : (
              // Botones de confirmación: transfer y modo (MP tiene su propio botón en el brick)
              (selectedPaymentMethod === "transfer" ||
                (selectedPaymentMethod === "modo" && !modoData)) && (
                <button
                  onClick={hookFormHandleSubmit(
                    selectedPaymentMethod === "modo"
                      ? onSubmitModo
                      : onSubmit,
                  )}
                  disabled={isSubmitting || isValidatingStock}
                  className="px-8 py-3 bg-yerba-600 text-white rounded-full hover:bg-yerba-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      Procesando...
                    </>
                  ) : selectedPaymentMethod === "modo" ? (
                    "Generar código QR"
                  ) : (
                    "Confirmar Pedido"
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Resumen del total */}
        <div className="mt-8 bg-stone-50 p-6 rounded-xl">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${total.toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
