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
import {
  Loader2,
  AlertTriangle,
  Tag,
  Check,
  X,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";

import { useFormContext } from "react-hook-form";
import { PersonalInfoStep } from "./checkout-steps/personal-info-step";
import { DeliveryMethodStep } from "./checkout-steps/delivery-method-step";
import { DeliveryDetailsStep } from "./checkout-steps/delivery-details-step";
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

// Steps del nuevo flow de 4 pasos.
// El step "details" se saltea cuando deliveryType === "pickup".
const steps = [
  { id: "personal", label: "Tus Datos", number: 1 },
  { id: "method", label: "Entrega", number: 2 },
  { id: "details", label: "Datos de envío", number: 3 },
  { id: "payment", label: "Pago", number: 4 },
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
      shippingProvinceCode: "",
    },
  });

  const { trigger, watch, reset, getValues, register } = methods;

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

  // Watches usados para lógica de navegación
  const deliveryType = watch("deliveryType");
  const isPickup = deliveryType === "pickup";

  const handleNext = async () => {
    let isStepValid = false;
    switch (currentStep) {
      case 0: // Datos personales
        isStepValid = await trigger([
          "customerName",
          "customerEmail",
          "customerPhone",
        ]);
        break;

      case 1: // Método de entrega
        isStepValid = await trigger(["deliveryType"]);
        // Si eligió envío, verificar también que haya elegido D o S
        if (isStepValid && getValues().deliveryType === "shipping") {
          const sdt = getValues().shippingDeliveryType;
          if (sdt !== "D" && sdt !== "S") {
            toast.error("Falta elegir el tipo de envío", {
              description:
                "Seleccioná Envío a domicilio o Retiro en sucursal.",
            });
            return;
          }
        }
        break;

      case 2: {
        // Datos del envío — depende de D o S
        const sdt = getValues().shippingDeliveryType;
        if (sdt === "D") {
          isStepValid = await trigger([
            "streetName",
            "streetNumber",
            "city",
            "zipCode",
            "shippingProvinceCode",
          ]);
        } else if (sdt === "S") {
          isStepValid = await trigger([
            "zipCode",
            "shippingProvinceCode",
            "shippingAgencyCode",
          ]);
        }
        if (isStepValid) {
          const d = getValues();
          if (
            (d.shippingCost ?? 0) <= 0 ||
            d.shippingProvider !== "correo_argentino"
          ) {
            toast.error("Falta cotizar el envío", {
              description:
                "Ingresá un código postal válido y seleccioná una tarifa antes de continuar.",
            });
            return;
          }
        }
        break;
      }

      case 3: // Pago — validamos stock antes de mostrar el brick
        isStepValid = await validateStockBeforeSubmit();
        break;
    }

    if (!isStepValid) return;

    // Skip de step 2 cuando es pickup: de step 1 (Método) → step 3 (Pago) directo
    if (currentStep === 1 && isPickup) {
      setCurrentStep(3);
      setStockErrors([]);
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setStockErrors([]);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    // Volver de step 3 (Pago) → step 1 (Método) directo cuando es pickup
    if (currentStep === 3 && isPickup) {
      setCurrentStep(1);
      setStockErrors([]);
      return;
    }
    setCurrentStep((prev) => prev - 1);
    setStockErrors([]);
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

  // Label del botón Continuar — cambia cuando es pickup en step 1
  const continueLabel =
    currentStep === 1 && isPickup ? "Continuar al pago" : "Continuar";

  // En step 4 (Pago) usamos un container más ancho en desktop para que el
  // layout de 2 columnas (form + resumen sticky) tenga aire suficiente.
  const containerMaxW =
    currentStep === 3 ? "max-w-4xl lg:max-w-6xl" : "max-w-4xl";

  return (
    <FormProvider {...methods}>
      <div className={`${containerMaxW} mx-auto transition-[max-width] duration-300`}>
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

        {/* Indicador de pasos.
            Cuando es pickup, el step "details" se ve muted con guión
            en lugar de número y label tachado.
        */}
        <div className="mb-8 flex justify-between">
          {steps.map((step, index) => {
            const isSkipped = step.id === "details" && isPickup;
            const isCompleted = !isSkipped && index < currentStep;
            const isActive = !isSkipped && index === currentStep;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center"
                title={
                  isSkipped ? "Saltado: elegiste retiro en local" : undefined
                }
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                    isSkipped
                      ? "bg-stone-100 text-stone-400 border border-dashed border-stone-300"
                      : isActive || isCompleted
                        ? "bg-yerba-600 text-white"
                        : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {isSkipped ? "—" : isCompleted ? "✓" : step.number}
                </div>
                <span
                  className={`text-xs mt-2 ${
                    isSkipped
                      ? "text-stone-400 line-through decoration-stone-300"
                      : "text-stone-700"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
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
              {currentStep === 1 && <DeliveryMethodStep />}
              {currentStep === 2 && <DeliveryDetailsStep />}
              {currentStep === 3 && (
                <div className="lg:grid lg:grid-cols-3 lg:gap-6">
                  {/* MOBILE: resumen colapsable arriba (hidden en lg+) */}
                  <div className="lg:hidden mb-6">
                    <OrderSummary items={items} total={total} collapsible />
                  </div>

                  {/* COLUMNA IZQUIERDA: notas + cupón + brick (2/3 en desktop) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Notas + Cupón en una sola card compacta */}
                    <div className="space-y-4 border border-stone-200 rounded-xl p-4 bg-stone-50/50">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-stone-500" />
                            <span>Notas adicionales (opcional)</span>
                          </div>
                        </label>
                        <textarea
                          {...register("notes")}
                          rows={2}
                          placeholder="¿Alguna instrucción especial? Ej: Tocar timbre, dejar en portería…"
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all resize-none bg-white"
                        />
                      </div>
                      <CouponInput total={total} />
                    </div>

                    {/* Payment Brick: Mercado Pago — protagonista visual */}
                    {selectedPaymentMethod === "mercadopago" && (
                      <div>
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
                          onGoToDelivery={() => {
                            // Si es pickup volvemos al método; si no al detalle
                            setCurrentStep(isPickup ? 1 : 2);
                          }}
                          onSuccess={({ orderId }) => {
                            clearStoredData();
                            clearCart();
                            router.push(`/checkout/success?orderId=${orderId}`);
                          }}
                          onError={(err) =>
                            toast.error("Error en el pago", {
                              description: err.message,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* COLUMNA DERECHA: resumen completo sticky (solo desktop, 1/3) */}
                  <div className="hidden lg:block">
                    <div className="sticky top-6">
                      <OrderSummary items={items} total={total} />
                    </div>
                  </div>
                </div>
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
                  continueLabel
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* Resumen del total — visible en steps 0/1/2.
            En el step 3 (Pago) se omite porque el OrderSummary colapsable
            ya muestra el total en su header. */}
        {currentStep < 3 && (
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
        )}
      </div>
    </FormProvider>
  );
}
