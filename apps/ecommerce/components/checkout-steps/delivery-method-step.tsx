"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { Truck, Store, Home, Building2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";

/**
 * Paso 2 del checkout — solo elige el método de entrega.
 * No pide dirección ni cotiza. Eso queda para el paso 3 (DeliveryDetailsStep),
 * que se saltea si el cliente elige "Retiro en local".
 */
export function DeliveryMethodStep() {
  const { register, setValue, control } =
    useFormContext<CheckoutFormData>();

  const deliveryType = useWatch({ control, name: "deliveryType" });
  const shippingDeliveryType = useWatch({
    control,
    name: "shippingDeliveryType",
  });

  // Cuando elige "Envío con Correo" pero no eligió D/S aún → preseleccionar D
  // (es la opción más común y le ahorra un click al cliente).
  useEffect(() => {
    if (deliveryType === "shipping" && !shippingDeliveryType) {
      setValue("shippingDeliveryType", "D");
    }
  }, [deliveryType, shippingDeliveryType, setValue]);

  // Si cambia a pickup, limpiar D/S y datos de Correo
  useEffect(() => {
    if (deliveryType === "pickup") {
      setValue("shippingDeliveryType", "");
      setValue("shippingCost", 0);
      setValue("shippingProvider", "pickup");
      setValue("shippingAgencyCode", "");
      setValue("shippingAgencyName", "");
      setValue("shippingProductName", "");
    }
  }, [deliveryType, setValue]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Método de Entrega
        </h2>
        <p className="text-stone-600">Elegí cómo querés recibir tu pedido</p>
      </div>

      {/* Toggle principal: Envío vs Retiro */}
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
              <p className="font-semibold text-stone-900">Envío con Correo</p>
              <p className="text-sm text-stone-600 mt-1">
                Domicilio o sucursal — cotizamos por código postal
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
                Sin costo adicional
              </p>
              <p className="text-xs text-yerba-600 font-semibold mt-2">
                Gratis
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Sub-toggle D vs S cuando elige Envío con Correo */}
      <AnimatePresence>
        {deliveryType === "shipping" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-4 border-t border-stone-200"
          >
            <p className="text-sm font-medium text-stone-700">
              ¿Cómo querés que llegue tu envío?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  shippingDeliveryType === "D"
                    ? "border-yerba-600 bg-yerba-50"
                    : "border-stone-200 hover:border-yerba-300"
                }`}
                onClick={() => setValue("shippingDeliveryType", "D")}
              >
                <div className="flex items-start gap-3">
                  <Home
                    className={`h-5 w-5 mt-0.5 ${
                      shippingDeliveryType === "D"
                        ? "text-yerba-600"
                        : "text-stone-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-900">
                      Envío a domicilio
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Te lo llevan a la puerta de tu casa
                    </p>
                  </div>
                  {shippingDeliveryType === "D" && (
                    <CheckCircle2 className="h-5 w-5 text-yerba-600 shrink-0" />
                  )}
                </div>
              </label>

              <label
                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  shippingDeliveryType === "S"
                    ? "border-yerba-600 bg-yerba-50"
                    : "border-stone-200 hover:border-yerba-300"
                }`}
                onClick={() => setValue("shippingDeliveryType", "S")}
              >
                <div className="flex items-start gap-3">
                  <Building2
                    className={`h-5 w-5 mt-0.5 ${
                      shippingDeliveryType === "S"
                        ? "text-yerba-600"
                        : "text-stone-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-900">
                      Retiro en sucursal
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Más barato — lo retirás vos en una sucursal
                    </p>
                  </div>
                  {shippingDeliveryType === "S" && (
                    <CheckCircle2 className="h-5 w-5 text-yerba-600 shrink-0" />
                  )}
                </div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador inline cuando elige pickup → vas directo al pago */}
      <AnimatePresence>
        {deliveryType === "pickup" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Listo, no necesitás cargar más datos
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Coordinamos el retiro al confirmar el pago. Vas directo al pago
                en el siguiente paso.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
