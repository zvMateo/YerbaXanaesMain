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
import { Loader2, AlertTriangle } from "lucide-react";

import { PersonalInfoStep } from "./checkout-steps/personal-info-step";
import { DeliveryStep } from "./checkout-steps/delivery-step";
import { PaymentStep } from "./checkout-steps/payment-step";
import { OrderSummary } from "./checkout-steps/order-summary";

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
      // Permitir continuar si falla la validación
      return true;
    } finally {
      setIsValidatingStock(false);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    const stockValid = await validateStockBeforeSubmit();
    if (!stockValid) return;

    setIsSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      if (data.paymentMethod === "mercadopago") {
        // Redirigir al Checkout Pro (Billetera)
        const preferenceResponse = await fetch(`${apiUrl}/payments/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payerEmail: data.customerEmail,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            items: items.map((item) => ({
              id: item.variantId,
              title: item.productName || "Producto",
              quantity: item.quantity,
              unit_price: Number(item.price),
              currency_id: "ARS",
            })),
            orderItems: items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
            // Datos de envío para que se persistan con la orden
            deliveryType: data.deliveryType,
            shippingAddress: data.address,
            shippingCity: data.city,
            shippingProvinceCode: data.shippingProvinceCode,
            shippingZip: data.zipCode,
            shippingCost: data.shippingCost ?? 0,
            shippingProvider: data.shippingProvider,
          }),
        });

        if (!preferenceResponse.ok)
          throw new Error("Error creando preferencia");
        const preference = await preferenceResponse.json();

        clearStoredData();
        clearCart();
        window.location.href = preference.initPoint;
        return;
      }

      // Efectivo / Transferencia -> crear order directamente
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
          paymentMethod: data.paymentMethod.toUpperCase(),
          // Datos de envío
          deliveryType: data.deliveryType,
          shippingAddress: data.address,
          shippingCity: data.city,
          shippingProvinceCode: data.shippingProvinceCode,
          shippingZip: data.zipCode,
          shippingCost: data.shippingCost ?? 0,
          shippingProvider: data.shippingProvider,
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
              {currentStep === 2 && (
                <PaymentStep
                  total={total}
                  onPaymentSuccess={(result) => {
                    clearStoredData();
                    clearCart();
                    const r = result as { orderId?: string };
                    router.push(`/checkout/success?orderId=${r.orderId ?? ""}`);
                  }}
                  onPaymentError={(err) =>
                    toast.error("Error en el pago", {
                      description: err.message,
                    })
                  }
                />
              )}
              {currentStep === 3 && (
                <OrderSummary items={items} total={total} />
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
              // Ocultamos el botón "Confirmar" SI estamos en tarjeta de crédito,
              // ya que el CardPayment Brick tiene su propio botón "Pagar".
              selectedPaymentMethod !== "credit_card" && (
                <button
                  onClick={hookFormHandleSubmit(onSubmit)}
                  disabled={isSubmitting || isValidatingStock}
                  className="px-8 py-3 bg-yerba-600 text-white rounded-full hover:bg-yerba-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      Procesando...
                    </>
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
