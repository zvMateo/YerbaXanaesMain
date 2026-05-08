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

function CouponInput({ total }: { total: number }) {
  const { setValue, watch } = useFormContext<CheckoutFormData>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appliedCode = watch("couponCode");
  const discount = watch("couponDiscount") ?? 0;
  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  const [isValidatingStock, setIsValidatingStock] = useState(false);
  const [stockErrors, setStockErrors] = useState<
    Array<{ product: string; message: string }>
  >([]);
  // Hoist brick state so PaymentBrick doesn't re-init on every remount (step nav)
  const [brickOrderId, setBrickOrderId] = useState<string | null>(null);
  const [brickPreferenceId, setBrickPreferenceId] = useState<string | null>(
    null,
  );

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

  const {
    trigger,
    watch,
    reset,
    getValues,
  } = methods;

  // Restaurar datos del localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(CHECKOUT_STORAGE_KEY);
      const savedStep = localStorage.getItem(CHECKOUT_STEP_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData) as Partial<CheckoutFormData>;
        reset({ ...parsed, paymentMethod: "mercadopago" });
      }
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
        if (isStepValid) {
          const deliveryData = getValues();
          const hasSelectedShippingRate =
            deliveryData.deliveryType !== "shipping" ||
            ((deliveryData.shippingCost ?? 0) > 0 &&
              deliveryData.shippingProvider === "correo_argentino");

          if (!hasSelectedShippingRate) {
            toast.error("Falta cotizar el envío", {
              description:
                "Ingresá un código postal válido y seleccioná una opción de envío antes de continuar.",
            });
            return;
          }
        }
        break;
      case 2:
        isStepValid = await trigger(["paymentMethod"]);
        if (isStepValid) {
          isStepValid = await validateStockBeforeSubmit();
        }
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
      const response = await fetch(`${API_URL}/orders/validate`, {
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
                        existingOrderId={brickOrderId}
                        existingPreferenceId={brickPreferenceId}
                        onInit={({ orderId, preferenceId }) => {
                          setBrickOrderId(orderId);
                          setBrickPreferenceId(preferenceId);
                        }}
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

                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Botones de navegación */}
          <div className="flex justify-between mt-8 pt-6 border-t border-stone-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isValidatingStock}
              className="px-6 py-3 text-stone-600 disabled:opacity-50"
            >
              {currentStep === 0 ? "Cancelar" : "Volver"}
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={isValidatingStock}
                className="px-8 py-3 bg-yerba-600 text-white rounded-full hover:bg-yerba-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isValidatingStock ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    Validando...
                  </>
                ) : (
                  "Continuar"
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* Resumen del total */}
        <div className="mt-8 bg-stone-50 p-6 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span>${total.toLocaleString("es-AR")}</span>
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between text-stone-600">
              <span>Envío</span>
              <span>${shippingCost.toLocaleString("es-AR")}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Descuento</span>
              <span>−${couponDiscount.toLocaleString("es-AR")}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-stone-200">
            <span>Total</span>
            <span>${brickAmount.toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
