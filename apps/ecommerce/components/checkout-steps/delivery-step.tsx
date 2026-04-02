"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { Truck, Store, MapPin, Home, Building } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function DeliveryStep() {
  const {
    register,
    formState: { errors },
    setValue,
    control,
  } = useFormContext<CheckoutFormData>();

  const deliveryType = useWatch({ control, name: "deliveryType" });

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Método de Entrega
        </h2>
        <p className="text-stone-600">Elegí cómo querés recibir tu pedido</p>
      </div>

      {/* Opciones de entrega */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label
          className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
            deliveryType === "shipping"
              ? "border-yerba-600 bg-yerba-50"
              : "border-stone-200 hover:border-yerba-300"
          }`}
        >
          <input
            type="radio"
            value="shipping"
            {...register("deliveryType")}
            className="sr-only"
          />
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-lg ${
                deliveryType === "shipping" ? "bg-yerba-100" : "bg-stone-100"
              }`}
            >
              <Truck
                className={`h-6 w-6 ${
                  deliveryType === "shipping"
                    ? "text-yerba-600"
                    : "text-stone-500"
                }`}
              />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Envío a domicilio</p>
              <p className="text-sm text-stone-600 mt-1">
                Recibilo en tu casa en 24-48hs
              </p>
              <p className="text-xs text-yerba-600 mt-2">
                Gratis en compras +$15.000
              </p>
            </div>
          </div>
        </label>

        <label
          className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all ${
            deliveryType === "pickup"
              ? "border-yerba-600 bg-yerba-50"
              : "border-stone-200 hover:border-yerba-300"
          }`}
        >
          <input
            type="radio"
            value="pickup"
            {...register("deliveryType")}
            className="sr-only"
          />
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-lg ${
                deliveryType === "pickup" ? "bg-yerba-100" : "bg-stone-100"
              }`}
            >
              <Store
                className={`h-6 w-6 ${
                  deliveryType === "pickup"
                    ? "text-yerba-600"
                    : "text-stone-500"
                }`}
              />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Retiro en local</p>
              <p className="text-sm text-stone-600 mt-1">
                Retirá gratis en nuestro local
              </p>
              <p className="text-xs text-stone-500 mt-2">
                Buenos Aires, Argentina
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Campos de dirección - Solo si es envío */}
      <AnimatePresence>
        {deliveryType === "shipping" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-4 border-t border-stone-200"
          >
            <h3 className="font-semibold text-stone-900 mb-4">
              Dirección de envío
            </h3>

            {/* Calle y número */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Dirección
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  {...register("address")}
                  type="text"
                  placeholder="Ej: Av. Corrientes 1234, Piso 2, Depto B"
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Ciudad
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  {...register("city")}
                  type="text"
                  placeholder="Ej: Buenos Aires"
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
                />
              </div>
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.city.message}
                </p>
              )}
            </div>

            {/* Código Postal */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Código Postal
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  {...register("zipCode")}
                  type="text"
                  placeholder="Ej: 1001"
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
                />
              </div>
              {errors.zipCode && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.zipCode.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
