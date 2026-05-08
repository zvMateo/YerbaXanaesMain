"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import {
  Truck,
  Store,
  MapPin,
  Home,
  Building,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback } from "react";
import { useCartStore } from "@/stores/cart-store";

// ============================================================
// TIPOS
// ============================================================

interface ShippingRate {
  deliveredType: "D" | "S";
  productName: string;
  price: number;
  deliveryTimeMin: string;
  deliveryTimeMax: string;
  label: string;
}

interface ShippingRatesResponse {
  rates: ShippingRate[];
  source: "correo_argentino";
  packageWeightGrams: number;
}

const MANUAL_SHIPPING_WHATSAPP_URL =
  process.env.NEXT_PUBLIC_SHIPPING_WHATSAPP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  "https://wa.me/541100000000?text=Hola%2C%20necesito%20cotizar%20el%20env%C3%ADo%20de%20mi%20pedido%20de%20YerbaXanaes";

// Códigos de provincia de Correo Argentino para mapear desde nombre de ciudad
const PROVINCE_HINTS: Record<string, string> = {
  "buenos aires": "B",
  "capital federal": "C",
  "ciudad autónoma de buenos aires": "C",
  caba: "C",
  córdoba: "X",
  cordoba: "X",
  "santa fe": "S",
  mendoza: "M",
  tucumán: "T",
  tucuman: "T",
  salta: "A",
  "entre ríos": "E",
  "entre rios": "E",
  misiones: "N",
  chaco: "H",
  corrientes: "W",
  "santiago del estero": "G",
  "san luis": "D",
  "san juan": "J",
  "la rioja": "F",
  catamarca: "K",
  jujuy: "Y",
  "la pampa": "L",
  neuquén: "Q",
  neuquen: "Q",
  "río negro": "R",
  "rio negro": "R",
  chubut: "U",
  "santa cruz": "Z",
  "tierra del fuego": "V",
  formosa: "P",
};

function inferProvinceCode(city: string): string {
  if (!city) return "B"; // Default: Buenos Aires
  const normalized = city.toLowerCase().trim();
  for (const [key, code] of Object.entries(PROVINCE_HINTS)) {
    if (normalized.includes(key)) return code;
  }
  return "B";
}

// ============================================================
// COMPONENTE
// ============================================================

export function DeliveryStep() {
  const {
    register,
    formState: { errors },
    setValue,
    control,
  } = useFormContext<CheckoutFormData>();

  const { items } = useCartStore();
  const deliveryType = useWatch({ control, name: "deliveryType" });
  const zipCode = useWatch({ control, name: "zipCode" });
  const city = useWatch({ control, name: "city" });

  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesSource, setRatesSource] = useState<"correo_argentino" | null>(
    null,
  );

  const handleSelectRate = useCallback(
    (
      rate: ShippingRate,
      source: ShippingRatesResponse["source"],
    ) => {
      setSelectedRate(rate);
      setValue("shippingCost", rate.price);
      setValue("shippingProvider", source);
      // Inferir código de provincia desde la ciudad
      const provinceCode = inferProvinceCode(city || "");
      setValue("shippingProvinceCode", provinceCode);
    },
    [city, setValue],
  );

  // ── Cotizar envío cuando el CP tiene 4+ dígitos ───────────────
  const fetchRates = useCallback(
    async (zip: string) => {
      if (!zip || zip.length < 4 || deliveryType !== "shipping") return;
      if (items.length === 0) return;

      setRatesLoading(true);
      setRatesError(null);

      const apiUrl = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");

      try {
        const response = await fetch(`${apiUrl}/shipping/rates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postalCodeDestination: zip,
            items: items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          }),
        });

        if (!response.ok) throw new Error("Error al cotizar envío");

        const data: ShippingRatesResponse = await response.json();
        setRates(data.rates);
        setRatesSource(data.source);

        // Seleccionar la primera opción automáticamente para evitar costos stale al cambiar CP
        if (data.rates.length > 0) {
          handleSelectRate(data.rates[0], data.source);
        } else {
          setSelectedRate(null);
          setValue("shippingCost", 0);
          setValue("shippingProvider", "manual_quote_required");
          setRatesError(
            "No pudimos cotizar automáticamente el envío. Coordiná la cotización manual por WhatsApp.",
          );
        }
      } catch {
        setRatesError(
          "No pudimos cotizar automáticamente el envío. Coordiná la cotización manual por WhatsApp.",
        );
        setRates([]);
        setRatesSource(null);
        setSelectedRate(null);
        setValue("shippingCost", 0);
        setValue("shippingProvider", "manual_quote_required");
      } finally {
        setRatesLoading(false);
      }
    },
    [deliveryType, handleSelectRate, items, setValue],
  );

  // Debounce de 800ms para no llamar la API en cada keystroke
  useEffect(() => {
    if (deliveryType !== "shipping") return;
    setRates([]);
    setSelectedRate(null);
    setRatesSource(null);
    setRatesError(null);
    setValue("shippingCost", 0);
    setValue("shippingProvider", "manual_quote_required");

    const timer = setTimeout(() => {
      if (zipCode && zipCode.length >= 4) {
        fetchRates(zipCode);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [zipCode, deliveryType, fetchRates, setValue]);

  // Limpiar cotización si cambia a retiro
  useEffect(() => {
    if (deliveryType === "pickup") {
      setRates([]);
      setSelectedRate(null);
      setValue("shippingCost", 0);
      setValue("shippingProvider", "pickup");
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
                Correo Argentino — cotización por CP
              </p>
              {deliveryType === "shipping" && selectedRate ? (
                <p className="text-xs font-semibold text-yerba-700 mt-2">
                  ${selectedRate.price.toLocaleString("es-AR")} —{" "}
                  {selectedRate.deliveryTimeMin} a{" "}
                  {selectedRate.deliveryTimeMax} días
                </p>
              ) : (
                <p className="text-xs text-stone-400 mt-2">
                  Ingresá tu CP para ver el costo
                </p>
              )}
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
              <p className="text-sm text-stone-600 mt-1">Sin costo adicional</p>
              <p className="text-xs text-yerba-600 font-semibold mt-2">
                Gratis
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Campos de dirección + cotización */}
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

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Calle y número
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

            {/* Ciudad + CP en fila */}
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Cotización en tiempo real */}
            <div className="mt-4">
              {ratesLoading && (
                <div className="flex items-center gap-2 p-4 bg-stone-50 rounded-xl text-stone-600 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cotizando envío con Correo Argentino...
                </div>
              )}

                  {ratesError && !ratesLoading && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{ratesError}</p>
                  </div>
                  <a
                    href={MANUAL_SHIPPING_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Cotizar envío por WhatsApp
                  </a>
                </div>
              )}

              {!ratesLoading && rates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-700 flex items-center gap-1">
                    Opciones de envío
                    {ratesSource === "correo_argentino" && (
                      <span className="text-xs text-yerba-600 bg-yerba-50 px-2 py-0.5 rounded-full">
                        Correo Argentino
                      </span>
                    )}
                  </p>
                  {rates.map((rate, i) => (
                    <label
                      key={i}
                      className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedRate?.deliveredType === rate.deliveredType
                          ? "border-yerba-600 bg-yerba-50"
                          : "border-stone-200 hover:border-yerba-300"
                      }`}
                      onClick={() =>
                        handleSelectRate(rate, ratesSource || "correo_argentino")
                      }
                    >
                      <div className="flex items-center gap-2">
                        {selectedRate?.deliveredType === rate.deliveredType ? (
                          <CheckCircle2 className="h-5 w-5 text-yerba-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-stone-300 rounded-full" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-stone-900">
                            {rate.deliveredType === "D"
                              ? "Envío a domicilio"
                              : "Retiro en sucursal"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {rate.productName} · {rate.deliveryTimeMin} a{" "}
                            {rate.deliveryTimeMax} días hábiles
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-stone-900">
                        ${rate.price.toLocaleString("es-AR")}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {!ratesLoading && !zipCode && (
                <p className="text-xs text-stone-400 text-center py-2">
                  Ingresá tu código postal para ver las opciones de envío
                  disponibles
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
