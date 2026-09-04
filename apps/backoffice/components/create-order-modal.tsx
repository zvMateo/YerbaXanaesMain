"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  ShoppingBag,
  Store,
  Tent,
  Instagram,
  MessageCircle,
  Globe,
  Banknote,
  CreditCard,
  Building2,
  Package,
  Truck,
  Search,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useProducts, type Product } from "@/hooks/use-products";
import {
  useCreateOrder,
  type SalesChannel,
  type CreateOrderInput,
} from "@/hooks/use-orders";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ============================================================
// TIPOS INTERNOS
// ============================================================

interface OrderLineItem {
  productId: string;
  variantId: string;
  quantity: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type EntregaKind = "pickup" | "domicilio" | "sucursal";

interface Agency {
  code: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
}

// Misma lista que apps/ecommerce/schemas/checkout-schema.ts (códigos Correo).
const PROVINCES = [
  { code: "A", name: "Salta" },
  { code: "B", name: "Provincia de Buenos Aires" },
  { code: "C", name: "Ciudad Autónoma de Buenos Aires" },
  { code: "D", name: "San Luis" },
  { code: "E", name: "Entre Ríos" },
  { code: "F", name: "La Rioja" },
  { code: "G", name: "Santiago del Estero" },
  { code: "H", name: "Chaco" },
  { code: "J", name: "San Juan" },
  { code: "K", name: "Catamarca" },
  { code: "L", name: "La Pampa" },
  { code: "M", name: "Mendoza" },
  { code: "N", name: "Misiones" },
  { code: "P", name: "Formosa" },
  { code: "Q", name: "Neuquén" },
  { code: "R", name: "Río Negro" },
  { code: "S", name: "Santa Fe" },
  { code: "T", name: "Tucumán" },
  { code: "U", name: "Chubut" },
  { code: "V", name: "Tierra del Fuego" },
  { code: "W", name: "Corrientes" },
  { code: "X", name: "Córdoba" },
  { code: "Y", name: "Jujuy" },
  { code: "Z", name: "Santa Cruz" },
] as const;

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

// ============================================================
// CONFIG DE CANALES Y PAGOS
// ============================================================

const channelOptions: {
  value: SalesChannel;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { value: "STORE",     label: "Tienda",    icon: Store,         color: "border-stone-400 bg-stone-50 text-stone-700"   },
  { value: "FAIR",      label: "Feria",     icon: Tent,          color: "border-amber-400 bg-amber-50 text-amber-700"   },
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram,     color: "border-purple-400 bg-purple-50 text-purple-700"},
  { value: "WHATSAPP",  label: "WhatsApp",  icon: MessageCircle, color: "border-green-400 bg-green-50 text-green-700"   },
  { value: "ONLINE",    label: "Online",    icon: Globe,         color: "border-blue-400 bg-blue-50 text-blue-700"      },
];

const paymentOptions: {
  value: "CASH" | "TRANSFER" | "MERCADOPAGO";
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "CASH",        label: "Efectivo",      icon: Banknote  },
  { value: "TRANSFER",    label: "Transferencia", icon: Building2 },
  { value: "MERCADOPAGO", label: "MercadoPago",   icon: CreditCard},
];

const inputClass =
  "w-full min-h-11 px-4 py-3 border border-stone-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400";

// ============================================================
// HELPERS
// ============================================================

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function toastError(message: string) {
  void import("sonner").then(({ toast }) => toast.error(message));
}

function composeDisplayAddress(params: {
  streetName: string;
  streetNumber: string;
  floor: string;
  apartment: string;
}): string | undefined {
  const street = [params.streetName.trim(), params.streetNumber.trim()]
    .filter(Boolean)
    .join(" ");
  const extras = [
    params.floor.trim() ? `Piso ${params.floor.trim()}` : "",
    params.apartment.trim() ? `Depto ${params.apartment.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const composed = [street, extras].filter(Boolean).join(", ");
  return composed || undefined;
}

// ============================================================
// COMPONENTE
// ============================================================

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  // Estado del formulario
  const [channel, setChannel] = useState<SalesChannel>("STORE");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "MERCADOPAGO">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [entrega, setEntrega] = useState<EntregaKind>("pickup");
  const [shippingStreetName, setShippingStreetName] = useState("");
  const [shippingStreetNumber, setShippingStreetNumber] = useState("");
  const [shippingFloor, setShippingFloor] = useState("");
  const [shippingApartment, setShippingApartment] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingProvinceCode, setShippingProvinceCode] = useState("");
  const [shippingAgencyCode, setShippingAgencyCode] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([
    { productId: "", variantId: "", quantity: 1 },
  ]);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  const [agencyFilter, setAgencyFilter] = useState("");

  const isShipping = entrega !== "pickup";
  const isDomicilio = entrega === "domicilio";
  const isSucursal = entrega === "sucursal";

  // Solo productos activos
  const activeProducts = useMemo(
    () => products.filter((p: Product) => p.isActive),
    [products],
  );

  // Cálculo del total en tiempo real
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, line) => {
      const product = activeProducts.find((p: Product) => p.id === line.productId);
      const variant = product?.variants.find((v) => v.id === line.variantId);
      return sum + (variant?.price ?? 0) * line.quantity;
    }, 0);
  }, [orderItems, activeProducts]);

  const total = subtotal + (isShipping ? shippingCost : 0);

  const filteredAgencies = useMemo(() => {
    if (!agencyFilter.trim()) return agencies;
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
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

  const fetchAgencies = useCallback(async (province: string) => {
    if (!province) return;
    setAgenciesLoading(true);
    setAgenciesError(null);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/shipping/agencies?provinceCode=${encodeURIComponent(province)}`,
      );
      if (!response.ok) throw new Error("Error al cargar sucursales");
      const data = (await response.json()) as Agency[];
      setAgencies(Array.isArray(data) ? data : []);
    } catch {
      setAgenciesError(
        "No pudimos cargar las sucursales. Probá de nuevo o coordiná el envío a domicilio.",
      );
      setAgencies([]);
    } finally {
      setAgenciesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSucursal && shippingProvinceCode) {
      void fetchAgencies(shippingProvinceCode);
    } else {
      setAgencies([]);
      setAgenciesError(null);
    }
  }, [isSucursal, shippingProvinceCode, fetchAgencies]);

  useEffect(() => {
    setShippingAgencyCode("");
    setAgencyFilter("");
  }, [shippingProvinceCode]);

  // ────────────────────────────────────────────────
  // Handlers de items
  // ────────────────────────────────────────────────

  function addItem() {
    setOrderItems((prev) => [
      ...prev,
      { productId: "", variantId: "", quantity: 1 },
    ]);
  }

  function removeItem(idx: number) {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OrderLineItem, value: string | number) {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "productId") {
          return { ...item, productId: value as string, variantId: "", quantity: 1 };
        }
        return { ...item, [field]: value };
      }),
    );
  }

  function handleSelectAgency(agency: Agency) {
    setShippingAgencyCode(agency.code);
    if (agency.city) setShippingCity(agency.city);
    if (agency.postalCode && !shippingZip.trim()) {
      setShippingZip(agency.postalCode);
    }
  }

  function resetForm() {
    setChannel("STORE");
    setPaymentMethod("CASH");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setEntrega("pickup");
    setShippingStreetName("");
    setShippingStreetNumber("");
    setShippingFloor("");
    setShippingApartment("");
    setShippingCity("");
    setShippingZip("");
    setShippingProvinceCode("");
    setShippingAgencyCode("");
    setShippingCost(0);
    setNotes("");
    setOrderItems([{ productId: "", variantId: "", quantity: 1 }]);
    setAgencies([]);
    setAgenciesError(null);
    setAgencyFilter("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ────────────────────────────────────────────────
  // Submit
  // ────────────────────────────────────────────────

  function handleSubmit() {
    const validItems = orderItems.filter(
      (i) => i.variantId.trim() !== "" && i.quantity >= 1,
    );

    if (validItems.length === 0) {
      toastError("Agregá al menos un producto");
      return;
    }

    if (isDomicilio) {
      if (!shippingStreetName.trim() || !shippingStreetNumber.trim()) {
        toastError("Ingresá calle y altura para el envío a domicilio");
        return;
      }
      if (!shippingZip.trim()) {
        toastError("Ingresá el código postal");
        return;
      }
      if (!shippingProvinceCode) {
        toastError("Seleccioná la provincia");
        return;
      }
    }

    if (isSucursal) {
      if (!shippingProvinceCode) {
        toastError("Seleccioná la provincia");
        return;
      }
      if (!shippingAgencyCode.trim()) {
        toastError("Seleccioná una sucursal de Correo Argentino");
        return;
      }
      if (!shippingZip.trim()) {
        toastError("Ingresá el código postal");
        return;
      }
    }

    const deliveryType: "pickup" | "shipping" = isShipping ? "shipping" : "pickup";
    const shippingDeliveryType: "D" | "S" | undefined = isDomicilio
      ? "D"
      : isSucursal
        ? "S"
        : undefined;

    const displayAddress = isDomicilio
      ? composeDisplayAddress({
          streetName: shippingStreetName,
          streetNumber: shippingStreetNumber,
          floor: shippingFloor,
          apartment: shippingApartment,
        })
      : isSucursal
        ? (() => {
            const agency = agencies.find((a) => a.code === shippingAgencyCode);
            return agency
              ? `${agency.name} — ${agency.address}, ${agency.city}`.trim()
              : `Sucursal ${shippingAgencyCode}`;
          })()
        : undefined;

    const input: CreateOrderInput = {
      channel,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryType,
      shippingAddress: displayAddress,
      shippingStreetName: isDomicilio ? shippingStreetName.trim() || undefined : undefined,
      shippingStreetNumber: isDomicilio
        ? shippingStreetNumber.trim() || undefined
        : undefined,
      shippingFloor: isDomicilio ? shippingFloor.trim() || undefined : undefined,
      shippingApartment: isDomicilio
        ? shippingApartment.trim() || undefined
        : undefined,
      shippingCity: isShipping ? shippingCity.trim() || undefined : undefined,
      shippingProvinceCode: isShipping
        ? shippingProvinceCode || undefined
        : undefined,
      shippingDeliveryType,
      shippingAgencyCode: isSucursal
        ? shippingAgencyCode.trim() || undefined
        : undefined,
      shippingZip: isShipping ? shippingZip.trim() || undefined : undefined,
      shippingCost: isShipping ? shippingCost : 0,
      shippingProvider: isShipping ? "correo_argentino" : "pickup",
      notes: notes.trim() || undefined,
      items: validItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    };

    createOrder.mutate(input, { onSuccess: handleClose });
  }

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-stretch justify-center p-0 md:items-center md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white shadow-2xl w-full h-[100dvh] max-h-[100dvh] flex flex-col rounded-none md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yerba-100 rounded-xl">
                    <ShoppingBag className="h-5 w-5 text-yerba-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">Nueva Venta</h2>
                    <p className="text-xs text-stone-500">
                      Registrá una venta manual y descontá el stock
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenido scrollable */}
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 space-y-6 sm:px-6">

                {/* ── Canal de venta ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Canal de venta
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {channelOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = channel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setChannel(opt.value)}
                          className={`flex min-h-11 flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                            active
                              ? opt.color + " border-opacity-100"
                              : "border-stone-200 text-stone-500 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ── Método de pago ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Método de pago
                  </h3>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">
                    Esto <strong>no cobra por Mercado Pago</strong>. Registrá acá
                    ventas de feria, local o transferencia. El cobro lo
                    confirmás vos.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {paymentOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = paymentMethod === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`flex min-h-11 items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            active
                              ? "border-yerba-500 bg-yerba-50 text-yerba-700"
                              : "border-stone-200 text-stone-500 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {paymentMethod === "CASH" && (
                    <p className="mt-2 text-xs text-yerba-700 bg-yerba-50 border border-yerba-100 rounded-lg px-3 py-2">
                      Efectivo: la orden queda como <strong>Pagada</strong> al
                      guardar (ya cobraste).
                    </p>
                  )}
                  {paymentMethod === "TRANSFER" && (
                    <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      Transferencia: queda <strong>Pendiente</strong> hasta que
                      veas el depósito. Después marcá <strong>Pagada</strong> en
                      la orden.
                    </p>
                  )}
                  {paymentMethod === "MERCADOPAGO" && (
                    <p className="mt-2 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                      Mercado Pago online se cobra solo desde la tienda. Acá
                      solo registrás el canal si ya cobraste por un link externo.
                    </p>
                  )}
                </section>

                {/* ── Datos del cliente (opcionales) ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Datos del cliente{" "}
                    <span className="text-stone-400 font-normal">(opcional)</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="min-h-11 px-4 py-3 border border-stone-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="min-h-11 px-4 py-3 border border-stone-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="sm:col-span-2 min-h-11 px-4 py-3 border border-stone-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                    />
                  </div>
                </section>

                {/* ── Productos ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Productos
                  </h3>
                  <div className="space-y-2">
                    {orderItems.map((line, idx) => {
                      const selectedProduct = activeProducts.find(
                        (p: Product) => p.id === line.productId,
                      );
                      const selectedVariant = selectedProduct?.variants.find(
                        (v) => v.id === line.variantId,
                      );
                      const stockWarning =
                        selectedVariant &&
                        line.quantity > selectedVariant.stock &&
                        selectedVariant.stock > 0;
                      const noStock =
                        selectedVariant && selectedVariant.stock === 0;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start bg-stone-50 rounded-xl p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <select
                              value={line.productId}
                              onChange={(e) =>
                                updateItem(idx, "productId", e.target.value)
                              }
                              className="w-full min-h-11 px-3 py-2 border border-stone-200 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                            >
                              <option value="">Seleccionar producto...</option>
                              {activeProducts.map((p: Product) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-1 min-w-0">
                            <select
                              value={line.variantId}
                              onChange={(e) =>
                                updateItem(idx, "variantId", e.target.value)
                              }
                              disabled={!line.productId}
                              className="w-full min-h-11 px-3 py-2 border border-stone-200 rounded-lg text-base bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                            >
                              <option value="">Variante...</option>
                              {selectedProduct?.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} — {formatPrice(v.price)}
                                  {v.stock <= 0
                                    ? " (sin stock)"
                                    : ` (stock: ${v.stock})`}
                                </option>
                              ))}
                            </select>
                            {(noStock ?? false) && (
                              <p className="text-xs text-red-500 mt-1">
                                Sin stock disponible
                              </p>
                            )}
                            {(stockWarning ?? false) && !noStock && (
                              <p className="text-xs text-amber-600 mt-1">
                                Stock disponible:{" "}
                                {selectedVariant?.stock}
                              </p>
                            )}
                          </div>

                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "quantity",
                                Math.max(1, parseInt(e.target.value) || 1),
                              )
                            }
                            className="w-full sm:w-16 min-h-11 px-2 py-2 border border-stone-200 rounded-lg text-base text-center bg-white focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                          />

                          {selectedVariant && (
                            <span className="text-sm font-medium text-stone-700 py-2 whitespace-nowrap">
                              {formatPrice(selectedVariant.price * line.quantity)}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={orderItems.length === 1}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 self-end sm:self-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-2 flex items-center gap-1.5 text-sm text-yerba-600 hover:text-yerba-700 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar producto
                  </button>
                </section>

                {/* ── Entrega ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Entrega
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
                    {(
                      [
                        { value: "pickup" as const, label: "Retiro", icon: Package },
                        { value: "domicilio" as const, label: "Domicilio", icon: Truck },
                        { value: "sucursal" as const, label: "Sucursal", icon: Building2 },
                      ]
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = entrega === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEntrega(opt.value)}
                          className={`flex min-h-11 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all ${
                            active
                              ? "border-yerba-500 bg-yerba-50 text-yerba-700"
                              : "border-stone-200 text-stone-500 hover:border-stone-300 bg-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {isDomicilio && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Calle *"
                          value={shippingStreetName}
                          onChange={(e) => setShippingStreetName(e.target.value)}
                          className={`col-span-2 ${inputClass}`}
                        />
                        <input
                          type="text"
                          placeholder="Altura *"
                          value={shippingStreetNumber}
                          onChange={(e) => setShippingStreetNumber(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Piso (opcional)"
                          value={shippingFloor}
                          onChange={(e) => setShippingFloor(e.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="Depto (opcional)"
                          value={shippingApartment}
                          onChange={(e) => setShippingApartment(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Ciudad"
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="Código postal *"
                          value={shippingZip}
                          onChange={(e) => setShippingZip(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <select
                        value={shippingProvinceCode}
                        onChange={(e) => setShippingProvinceCode(e.target.value)}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="">Provincia *</option>
                        {PROVINCES.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        placeholder="Costo de envío (ARS)"
                        value={shippingCost || ""}
                        onChange={(e) =>
                          setShippingCost(parseFloat(e.target.value) || 0)
                        }
                        className={inputClass}
                      />
                    </motion.div>
                  )}

                  {isSucursal && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <select
                        value={shippingProvinceCode}
                        onChange={(e) => setShippingProvinceCode(e.target.value)}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="">Provincia *</option>
                        {PROVINCES.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Código postal *"
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        className={inputClass}
                      />

                      {shippingProvinceCode && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-medium text-stone-600">
                            Sucursal de Correo Argentino
                          </p>

                          {agenciesLoading && (
                            <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg text-stone-600 text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Cargando sucursales...
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
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={agencyFilter}
                                  onChange={(e) => setAgencyFilter(e.target.value)}
                                  placeholder="Buscar por nombre, ciudad o dirección…"
                                  className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-yerba-500/30 focus:outline-none"
                                />
                              </div>
                              <div className="max-h-56 overflow-y-auto space-y-1 border border-stone-200 rounded-lg p-2">
                                {filteredAgencies.length === 0 ? (
                                  <p className="text-xs text-stone-400 text-center py-4">
                                    No hay sucursales que coincidan con “
                                    {agencyFilter}”.
                                  </p>
                                ) : (
                                  filteredAgencies.map((agency) => (
                                    <button
                                      key={agency.code}
                                      type="button"
                                      onClick={() => handleSelectAgency(agency)}
                                      className={`w-full min-h-11 flex items-start gap-3 p-3 rounded-lg text-left transition-all border-2 ${
                                        shippingAgencyCode === agency.code
                                          ? "border-yerba-600 bg-yerba-50"
                                          : "border-transparent hover:bg-stone-50"
                                      }`}
                                    >
                                      {shippingAgencyCode === agency.code ? (
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
                                          {agency.postalCode &&
                                            ` (CP ${agency.postalCode})`}
                                        </p>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </>
                          )}

                          {!agenciesLoading &&
                            !agenciesError &&
                            agencies.length === 0 && (
                              <p className="text-xs text-stone-400 text-center py-2">
                                No hay sucursales disponibles para esta provincia.
                              </p>
                            )}
                        </div>
                      )}

                      {!shippingProvinceCode && (
                        <p className="text-xs text-stone-400 text-center py-2">
                          Seleccioná la provincia para ver sucursales.
                        </p>
                      )}

                      <input
                        type="number"
                        min={0}
                        placeholder="Costo de envío (ARS)"
                        value={shippingCost || ""}
                        onChange={(e) =>
                          setShippingCost(parseFloat(e.target.value) || 0)
                        }
                        className={inputClass}
                      />
                    </motion.div>
                  )}
                </section>

                {/* ── Notas internas ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-2">
                    Notas internas{" "}
                    <span className="text-stone-400 font-normal">(opcional)</span>
                  </h3>
                  <textarea
                    placeholder="Ej: @cliente_ig · Pagó por link · Stand 5"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                  />
                </section>
              </div>

              {/* Footer fijo con totales y botones */}
              <div className="border-t border-stone-100 px-4 py-4 sm:px-6">
                <div className="flex justify-end mb-4 text-sm">
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between gap-8 text-stone-500">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {isShipping && shippingCost > 0 && (
                      <div className="flex justify-between gap-8 text-stone-500">
                        <span>Envío</span>
                        <span>{formatPrice(shippingCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-8 font-bold text-stone-900 text-base pt-1 border-t border-stone-100">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={createOrder.isPending}
                    className="w-full sm:w-auto min-h-11 px-5 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createOrder.isPending}
                    className="flex w-full sm:w-auto min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-yerba-600 hover:bg-yerba-700 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {createOrder.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        Registrar venta
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
