"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useProducts, type Product } from "@/hooks/use-products";
import {
  useCreateOrder,
  type SalesChannel,
  type CreateOrderInput,
} from "@/hooks/use-orders";

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
  const [deliveryType, setDeliveryType] = useState<"pickup" | "shipping">("pickup");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([
    { productId: "", variantId: "", quantity: 1 },
  ]);

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

  const total = subtotal + (deliveryType === "shipping" ? shippingCost : 0);

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
          // Al cambiar producto, resetear variante
          return { ...item, productId: value as string, variantId: "", quantity: 1 };
        }
        return { ...item, [field]: value };
      }),
    );
  }

  // ────────────────────────────────────────────────
  // Reset al cerrar
  // ────────────────────────────────────────────────

  function handleClose() {
    setChannel("STORE");
    setPaymentMethod("CASH");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setDeliveryType("pickup");
    setShippingAddress("");
    setShippingCity("");
    setShippingZip("");
    setShippingCost(0);
    setNotes("");
    setOrderItems([{ productId: "", variantId: "", quantity: 1 }]);
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
      import("sonner").then(({ toast }) =>
        toast.error("Agregá al menos un producto"),
      );
      return;
    }

    if (deliveryType === "shipping" && !shippingAddress.trim()) {
      import("sonner").then(({ toast }) =>
        toast.error("Ingresá la dirección de envío"),
      );
      return;
    }

    const input: CreateOrderInput = {
      channel,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryType,
      shippingAddress: shippingAddress.trim() || undefined,
      shippingCity: shippingCity.trim() || undefined,
      shippingZip: shippingZip.trim() || undefined,
      shippingCost: deliveryType === "shipping" ? shippingCost : 0,
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
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
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenido scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* ── Canal de venta ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Canal de venta
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {channelOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = channel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setChannel(opt.value)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
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
                  <div className="grid grid-cols-3 gap-2">
                    {paymentOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = paymentMethod === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
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
                </section>

                {/* ── Datos del cliente (opcionales) ── */}
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3">
                    Datos del cliente{" "}
                    <span className="text-stone-400 font-normal">(opcional)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="col-span-2 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
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
                          className="flex gap-2 items-start bg-stone-50 rounded-xl p-3"
                        >
                          {/* Select Producto */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={line.productId}
                              onChange={(e) =>
                                updateItem(idx, "productId", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                            >
                              <option value="">Seleccionar producto...</option>
                              {activeProducts.map((p: Product) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Select Variante */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={line.variantId}
                              onChange={(e) =>
                                updateItem(idx, "variantId", e.target.value)
                              }
                              disabled={!line.productId}
                              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
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

                          {/* Cantidad */}
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
                            className="w-16 px-2 py-2 border border-stone-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                          />

                          {/* Subtotal línea */}
                          {selectedVariant && (
                            <span className="text-sm font-medium text-stone-700 py-2 whitespace-nowrap">
                              {formatPrice(selectedVariant.price * line.quantity)}
                            </span>
                          )}

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={orderItems.length === 1}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
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
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { value: "pickup",   label: "Retiro en local", icon: Package },
                      { value: "shipping", label: "Envío a domicilio", icon: Truck  },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = deliveryType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setDeliveryType(opt.value as "pickup" | "shipping")
                          }
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
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

                  {deliveryType === "shipping" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        placeholder="Dirección (calle y número) *"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Ciudad"
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                        />
                        <input
                          type="text"
                          placeholder="Código postal"
                          value={shippingZip}
                          onChange={(e) => setShippingZip(e.target.value)}
                          className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
                        />
                      </div>
                      <input
                        type="number"
                        min={0}
                        placeholder="Costo de envío (ARS)"
                        value={shippingCost || ""}
                        onChange={(e) =>
                          setShippingCost(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yerba-500/30 focus:border-yerba-400"
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
              <div className="border-t border-stone-100 px-6 py-4">
                {/* Resumen de totales */}
                <div className="flex justify-end mb-4 text-sm">
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between gap-8 text-stone-500">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {deliveryType === "shipping" && shippingCost > 0 && (
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

                {/* Acciones */}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={createOrder.isPending}
                    className="px-5 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createOrder.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-yerba-600 hover:bg-yerba-700 rounded-xl transition-colors disabled:opacity-60"
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
