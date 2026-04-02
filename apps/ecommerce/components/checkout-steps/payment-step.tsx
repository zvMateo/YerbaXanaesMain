"use client";

import { useFormContext } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import {
  CreditCard,
  Banknote,
  Landmark,
  FileText,
  ShieldCheck,
} from "lucide-react";
import dynamic from "next/dynamic";

const CardPaymentBrick = dynamic(
  () =>
    import("@/components/checkout/card-payment-brick").then(
      (mod) => mod.CardPaymentBrick,
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

interface PaymentStepProps {
  total: number;
  onPaymentSuccess?: (details: unknown) => void;
  onPaymentError?: (error: Error) => void;
}

const paymentMethods: {
  id: CheckoutFormData["paymentMethod"];
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "credit_card",
    label: "Tarjeta de Crédito / Débito",
    description: "Pago directo seguro vía MercadoPago",
    icon: CreditCard,
  },
  {
    id: "mercadopago",
    label: "MercadoPago Billetera",
    description: "Serás redirigido para pagar con tu cuenta",
    icon: ShieldCheck,
  },
  {
    id: "cash",
    label: "Efectivo",
    description: "Pagás al retirar o al recibir el envío",
    icon: Banknote,
  },
  {
    id: "transfer",
    label: "Transferencia Bancaria",
    description: "CBU/Alias — Te enviamos los datos por email",
    icon: Landmark,
  },
];

export function PaymentStep({
  total,
  onPaymentSuccess,
  onPaymentError,
}: PaymentStepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  const selectedMethod = watch("paymentMethod");

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Método de Pago
        </h2>
        <p className="text-stone-600">Elegí cómo querés pagar tu pedido</p>
      </div>

      <div className="space-y-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <label
              key={method.id}
              className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? "border-yerba-600 bg-yerba-50"
                  : "border-stone-200 hover:border-yerba-300 bg-white"
              }`}
            >
              <input
                type="radio"
                value={method.id}
                {...register("paymentMethod")}
                className="sr-only"
                onChange={() => setValue("paymentMethod", method.id)}
              />

              <div
                className={`p-3 rounded-lg mr-4 ${
                  isSelected ? "bg-yerba-100" : "bg-stone-100"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    isSelected ? "text-yerba-600" : "text-stone-500"
                  }`}
                />
              </div>

              <div className="flex-1">
                <span className="font-semibold text-stone-900">
                  {method.label}
                </span>
                <p className="text-sm text-stone-600 mt-0.5">
                  {method.description}
                </p>
              </div>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "border-yerba-600 bg-yerba-600"
                    : "border-stone-300"
                }`}
              >
                {isSelected && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
            </label>
          );
        })}
      </div>

      {errors.paymentMethod && (
        <p className="text-sm text-red-600 text-center">
          {errors.paymentMethod.message}
        </p>
      )}

      {/* Flujo Brick Tarjetas */}
      {selectedMethod === "credit_card" && (
        <div className="mt-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              Ingresá los datos de tu tarjeta
            </h3>
            <p className="text-sm text-stone-600">
              Tus datos están protegidos y viajan encriptados
            </p>
          </div>
          <CardPaymentBrick
            amount={total}
            onSuccess={onPaymentSuccess}
            onError={onPaymentError}
          />
        </div>
      )}

      {/* Flujo Billetera */}
      {selectedMethod === "mercadopago" && (
        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
          <p className="text-sm text-center">
            Al hacer click en <b>Confirmar Pedido</b> serás redirigido al portal
            de MercadoPago para abonar con tu cuenta.
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-stone-200">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-stone-500" />
            <span>Notas adicionales (opcional)</span>
          </div>
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="¿Alguna instrucción especial? Ej: Tocar timbre, dejar en portería, etc."
          className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all resize-none"
        />
      </div>
    </div>
  );
}
