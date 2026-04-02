"use client";

import { useFormContext } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { User, Mail, Phone } from "lucide-react";

export function PersonalInfoStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormData>();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Tus Datos Personales
        </h2>
        <p className="text-stone-600">
          Completá tus datos para poder contactarte sobre tu pedido
        </p>
      </div>

      <div className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              {...register("customerName")}
              type="text"
              placeholder="Ej: María González"
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
            />
          </div>
          {errors.customerName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              {...register("customerEmail")}
              type="email"
              placeholder="Ej: maria@email.com"
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
            />
          </div>
          {errors.customerEmail && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerEmail.message}
            </p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Teléfono
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              {...register("customerPhone")}
              type="tel"
              placeholder="Ej: 11 1234-5678"
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
            />
          </div>
          {errors.customerPhone && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerPhone.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
