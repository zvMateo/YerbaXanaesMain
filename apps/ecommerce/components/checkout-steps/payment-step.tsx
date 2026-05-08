"use client";

import { useFormContext } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { FileText } from "lucide-react";
import { MercadoPagoLogo } from "@/components/checkout/mercado-pago-logo";

interface PaymentStepProps {
  /** @deprecated El brick ahora vive en el paso de confirmación */
  total?: number;
}

function MercadoPagoIcon({ className }: { className?: string }) {
  return <MercadoPagoLogo variant="horizontal" className={className} />;
}

const paymentMethods: {
  id: CheckoutFormData["paymentMethod"];
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}[] = [
  {
    id: "mercadopago",
    label: "Mercado Pago",
    description:
      "Tarjeta de crédito/débito, billetera MP o Rapipago — sin salir del sitio",
    icon: MercadoPagoIcon,
  },
];

export function PaymentStep({ total: _total }: PaymentStepProps) {
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
            <div key={method.id} className="space-y-2">
              <label
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
                  onChange={() => {
                    setValue("paymentMethod", method.id);
                  }}
                />

                <div
                  className={`p-3 rounded-lg mr-4 flex items-center justify-center ${
                    method.id === "mercadopago"
                      ? "w-28 h-12"
                      : "w-12 h-12"
                  } ${isSelected ? "bg-yerba-100" : "bg-stone-100"}`}
                >
                  <Icon
                    className={
                       method.id === "mercadopago"
                        ? "h-7 w-auto max-w-23 object-contain"
                        : `h-6 w-6 ${
                            isSelected ? "text-yerba-600" : "text-stone-500"
                          }`
                    }
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900">
                      {method.label}
                    </span>
                    {method.badge && (
                      <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                        {method.badge}
                      </span>
                    )}
                  </div>
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
            </div>
          );
        })}
      </div>

      {errors.paymentMethod && (
        <p className="text-sm text-red-600 text-center">
          {errors.paymentMethod.message}
        </p>
      )}

      {selectedMethod === "mercadopago" && (
        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
          <p className="text-sm text-center">
            En el siguiente paso podrás elegir cómo pagar:{" "}
            <b>tarjeta, billetera o Rapipago</b>. Todo sin salir del sitio.
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
