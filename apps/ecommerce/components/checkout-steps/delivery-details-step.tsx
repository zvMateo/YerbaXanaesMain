"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  CheckoutFormData,
  PROVINCES,
} from "@/schemas/checkout-schema";
import {
  MapPin,
  Home,
  Building,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Building2,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback, useMemo } from "react";
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

interface Agency {
  code: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
}

const MANUAL_SHIPPING_WHATSAPP_URL =
  process.env.NEXT_PUBLIC_SHIPPING_WHATSAPP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
  "https://wa.me/541100000000?text=Hola%2C%20necesito%20cotizar%20el%20env%C3%ADo%20de%20mi%20pedido%20de%20YerbaXanaes";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

/**
 * Paso 3 del checkout — datos del envío.
 *
 * Renderiza un form distinto según `shippingDeliveryType` (D o S) seleccionado
 * en el paso anterior:
 * - D: calle, altura, piso, depto, ciudad, CP, provincia + tarifas filtradas a D
 * - S: provincia + CP + selector de sucursal + tarifas filtradas a S
 *
 * Si el cliente eligió pickup en el paso anterior, este paso se saltea desde
 * checkout-form (no se monta este componente).
 */
export function DeliveryDetailsStep() {
  const {
    register,
    formState: { errors },
    setValue,
    control,
  } = useFormContext<CheckoutFormData>();

  const { items } = useCartStore();
  const zipCode = useWatch({ control, name: "zipCode" });
  const provinceCode = useWatch({ control, name: "shippingProvinceCode" });
  const shippingDeliveryType = useWatch({
    control,
    name: "shippingDeliveryType",
  });
  const selectedAgencyCode = useWatch({ control, name: "shippingAgencyCode" });
  const selectedProductName = useWatch({
    control,
    name: "shippingProductName",
  });

  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  // Filtro de búsqueda local — el endpoint /agencies solo filtra por provincia,
  // así que damos un input que filtra el array en cliente por name/city/code.
  const [agencyFilter, setAgencyFilter] = useState("");

  const isDomicilio = shippingDeliveryType === "D";
  const isSucursal = shippingDeliveryType === "S";

  // Filtrar rates al tipo elegido — la API devuelve D + S juntas pero solo
  // mostramos las del tipo correspondiente al paso actual.
  const filteredRates = useMemo(
    () => rates.filter((r) => r.deliveredType === shippingDeliveryType),
    [rates, shippingDeliveryType],
  );

  // Filtrar sucursales por texto (name / city / code / address). Case-insensitive
  // y normalizado para que tildes no afecten el match (ej. "cordoba" matchea
  // "Córdoba"). Usamos ̀-ͯ para borrar diacríticos combinatorios.
  const filteredAgencies = useMemo(() => {
    if (!agencyFilter.trim()) return agencies;
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    const q = normalize(agencyFilter.trim());
    return agencies.filter((a) => {
      return (
        normalize(a.name).includes(q) ||
        normalize(a.city).includes(q) ||
        normalize(a.code).includes(q) ||
        normalize(a.address).includes(q)
      );
    });
  }, [agencies, agencyFilter]);

  // Helper: aplicar la tarifa elegida al form
  const applyRate = useCallback(
    (rate: ShippingRate) => {
      setValue("shippingCost", rate.price);
      setValue("shippingProvider", "correo_argentino");
      setValue("shippingProductName", rate.productName);
    },
    [setValue],
  );

  // Cotizar envío cuando el CP tiene 4+ dígitos
  const fetchRates = useCallback(
    async (zip: string) => {
      if (!zip || zip.length < 4) return;
      if (items.length === 0) return;

      setRatesLoading(true);
      setRatesError(null);

      try {
        const response = await fetch(`${API_URL}/shipping/rates`, {
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

        // Auto-seleccionar la primera tarifa que coincida con el tipo elegido
        const firstMatching = data.rates.find(
          (r) => r.deliveredType === shippingDeliveryType,
        );
        if (firstMatching) {
          applyRate(firstMatching);
        } else {
          setValue("shippingCost", 0);
          setValue("shippingProvider", "manual_quote_required");
          setValue("shippingProductName", "");
          setRatesError(
            "No hay opciones disponibles para este tipo de envío. Coordiná la cotización manual por WhatsApp.",
          );
        }
      } catch {
        setRatesError(
          "No pudimos cotizar automáticamente el envío. Coordiná la cotización manual por WhatsApp.",
        );
        setRates([]);
        setValue("shippingCost", 0);
        setValue("shippingProvider", "manual_quote_required");
        setValue("shippingProductName", "");
      } finally {
        setRatesLoading(false);
      }
    },
    [applyRate, items, setValue, shippingDeliveryType],
  );

  // Debounce 800ms cuando cambia el CP
  useEffect(() => {
    setRates([]);
    setValue("shippingCost", 0);
    setValue("shippingProvider", "manual_quote_required");
    setValue("shippingProductName", "");
    setRatesError(null);

    const timer = setTimeout(() => {
      if (zipCode && zipCode.length >= 4) {
        fetchRates(zipCode);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [zipCode, fetchRates, setValue]);

  // Sucursales: cargar cuando hay provincia y eligió S
  const fetchAgencies = useCallback(async (province: string) => {
    if (!province) return;
    setAgenciesLoading(true);
    setAgenciesError(null);

    try {
      const response = await fetch(
        `${API_URL}/shipping/agencies?provinceCode=${encodeURIComponent(province)}`,
      );
      if (!response.ok) throw new Error("Error al cargar sucursales");
      const data = (await response.json()) as Agency[];
      setAgencies(Array.isArray(data) ? data : []);
    } catch {
      setAgenciesError(
        "No pudimos cargar las sucursales. Probá nuevamente o coordiná manualmente por WhatsApp.",
      );
      setAgencies([]);
    } finally {
      setAgenciesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSucursal && provinceCode) {
      fetchAgencies(provinceCode);
    } else {
      setAgencies([]);
      setAgenciesError(null);
    }
  }, [isSucursal, provinceCode, fetchAgencies]);

  // Cuando cambia provincia, limpiar agencia seleccionada y filtro de búsqueda
  useEffect(() => {
    setValue("shippingAgencyCode", "");
    setValue("shippingAgencyName", "");
    setAgencyFilter("");
  }, [provinceCode, setValue]);

  const handleSelectAgency = useCallback(
    (agency: Agency) => {
      setValue("shippingAgencyCode", agency.code);
      setValue(
        "shippingAgencyName",
        `${agency.name} — ${agency.address}, ${agency.city}`,
      );
    },
    [setValue],
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          {isDomicilio ? "Dirección de envío" : "Sucursal de retiro"}
        </h2>
        <p className="text-stone-600">
          {isDomicilio
            ? "Completá los datos para que el envío llegue a tu casa"
            : "Elegí la sucursal donde querés retirar tu pedido"}
        </p>
      </div>

      {/* === FORM PARA ENVÍO A DOMICILIO === */}
      {isDomicilio && (
        <div className="space-y-4">
          {/* Calle + altura */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Calle
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  {...register("streetName")}
                  type="text"
                  placeholder="Ej: Av. Corrientes"
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
                />
              </div>
              {errors.streetName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.streetName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Altura
              </label>
              <input
                {...register("streetNumber")}
                type="text"
                placeholder="1234"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
              />
              {errors.streetNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.streetNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Piso + Depto (opcionales) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Piso <span className="text-stone-400">(opcional)</span>
              </label>
              <input
                {...register("floor")}
                type="text"
                placeholder="Ej: 2"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Depto <span className="text-stone-400">(opcional)</span>
              </label>
              <input
                {...register("apartment")}
                type="text"
                placeholder="Ej: B"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Ciudad + CP */}
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
                  placeholder="Ej: Villa del Rosario"
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
                  placeholder="Ej: 5963"
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

          {/* Provincia */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Provincia
            </label>
            <select
              {...register("shippingProvinceCode")}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">Seleccioná una provincia...</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.shippingProvinceCode && (
              <p className="mt-1 text-sm text-red-600">
                {errors.shippingProvinceCode.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* === FORM PARA SUCURSAL === */}
      {isSucursal && (
        <div className="space-y-4">
          {/* Provincia + CP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Provincia
              </label>
              <select
                {...register("shippingProvinceCode")}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Seleccioná una provincia...</option>
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.shippingProvinceCode && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.shippingProvinceCode.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Tu Código Postal{" "}
                <span className="text-stone-400 text-xs">(para cotizar)</span>
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  {...register("zipCode")}
                  type="text"
                  placeholder="Ej: 5963"
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

          {/* Selector de sucursal */}
          <AnimatePresence>
            {provinceCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2"
              >
                <p className="text-sm font-medium text-stone-700">
                  Elegí una sucursal para retirar
                </p>

                {agenciesLoading && (
                  <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg text-stone-600 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando sucursales disponibles...
                  </div>
                )}

                {agenciesError && !agenciesLoading && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{agenciesError}</p>
                  </div>
                )}

                {!agenciesLoading && agencies.length > 0 && (
                  <>
                    {/* Input de búsqueda — filtra el listado on-the-fly */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                      <input
                        type="text"
                        value={agencyFilter}
                        onChange={(e) => setAgencyFilter(e.target.value)}
                        placeholder="Buscar por nombre, ciudad o dirección…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 border border-stone-200 rounded-lg p-2">
                      {filteredAgencies.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-4">
                          No encontramos sucursales que coincidan con &ldquo;{agencyFilter}&rdquo;.
                        </p>
                      ) : (
                        filteredAgencies.map((agency) => (
                          <label
                            key={agency.code}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                              selectedAgencyCode === agency.code
                                ? "border-yerba-600 bg-yerba-50"
                                : "border-transparent hover:bg-stone-50"
                            }`}
                            onClick={() => handleSelectAgency(agency)}
                          >
                            {selectedAgencyCode === agency.code ? (
                              <CheckCircle2 className="h-5 w-5 text-yerba-600 mt-0.5 shrink-0" />
                            ) : (
                              <Building2 className="h-5 w-5 text-stone-400 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-stone-900">
                                {agency.name}
                              </p>
                              <p className="text-xs text-stone-500 truncate">
                                {agency.address}
                                {agency.address && agency.city && " — "}
                                {agency.city}
                                {agency.postalCode && ` (CP ${agency.postalCode})`}
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    {agencyFilter.trim() && filteredAgencies.length > 0 && (
                      <p className="text-[10px] text-stone-400 text-right">
                        Mostrando {filteredAgencies.length} de {agencies.length} sucursales
                      </p>
                    )}
                  </>
                )}

                {!agenciesLoading &&
                  !agenciesError &&
                  agencies.length === 0 &&
                  provinceCode && (
                    <p className="text-xs text-stone-400 text-center py-2">
                      No hay sucursales disponibles para esta provincia.
                    </p>
                  )}

                {errors.shippingAgencyCode && (
                  <p className="text-sm text-red-600">
                    {errors.shippingAgencyCode.message}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!provinceCode && (
            <p className="text-xs text-stone-400 text-center py-2">
              Seleccioná tu provincia para ver las sucursales disponibles.
            </p>
          )}
        </div>
      )}

      {/* === COTIZACIÓN (tarifas filtradas al tipo elegido) === */}
      <div className="mt-4 space-y-3 pt-4 border-t border-stone-200">
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

        {!ratesLoading && filteredRates.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700 flex items-center gap-1">
              {isDomicilio
                ? "Tarifas de envío a domicilio"
                : "Tarifas de envío a sucursal"}
              <span className="text-xs text-yerba-600 bg-yerba-50 px-2 py-0.5 rounded-full">
                Correo Argentino
              </span>
            </p>
            {filteredRates.map((rate, i) => {
              const isSelected = selectedProductName === rate.productName;
              return (
                <label
                  key={`${rate.deliveredType}-${rate.productName}-${i}`}
                  className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "border-yerba-600 bg-yerba-50"
                      : "border-stone-200 hover:border-yerba-300"
                  }`}
                  onClick={() => applyRate(rate)}
                >
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-yerba-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-stone-300 rounded-full" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {rate.productName}
                      </p>
                      <p className="text-xs text-stone-500">
                        {rate.deliveryTimeMin} a {rate.deliveryTimeMax} días
                        hábiles
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-stone-900">
                    ${rate.price.toLocaleString("es-AR")}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {!ratesLoading && !zipCode && (
          <p className="text-xs text-stone-400 text-center py-2">
            Ingresá tu código postal para ver las tarifas disponibles
          </p>
        )}
      </div>
    </div>
  );
}
