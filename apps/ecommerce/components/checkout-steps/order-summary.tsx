"use client";

import { useFormContext } from "react-hook-form";
import { CheckoutFormData } from "@/schemas/checkout-schema";
import { CartItem } from "@/stores/cart-store";
import { Package, Truck, CreditCard, Banknote, Landmark } from "lucide-react";
import Image from "next/image";

interface OrderSummaryProps {
  items: CartItem[];
  total: number;
}

const paymentMethodLabels: Record<
  string,
  { label: string; icon: typeof CreditCard }
> = {
  mercadopago: { label: "MercadoPago", icon: CreditCard },
  cash: { label: "Efectivo", icon: Banknote },
  transfer: { label: "Transferencia Bancaria", icon: Landmark },
};

export function OrderSummary({ items, total }: OrderSummaryProps) {
  const { watch } = useFormContext<CheckoutFormData>();

  const formData = watch();

  // El shippingCost lo setea el delivery-step tras cotizar con Correo Argentino
  // 0 = retiro en local (gratis) | null/undefined = aún no cotizado | >0 = costo real
  const shippingCostRaw = formData.shippingCost;
  const isPickup = formData.deliveryType === "pickup";
  const shippingCost: number | null = isPickup
    ? 0
    : typeof shippingCostRaw === "number"
      ? shippingCostRaw
      : null;
  const finalTotal: number =
    shippingCost === null ? total : total + shippingCost;

  const PaymentIcon =
    paymentMethodLabels[formData.paymentMethod]?.icon || CreditCard;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Resumen del Pedido
        </h2>
        <p className="text-stone-600">Revisá los detalles antes de confirmar</p>
      </div>

      {/* Productos */}
      <div className="bg-stone-50 rounded-xl p-4">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-yerba-600" />
          Productos ({items.length})
        </h3>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white p-3 rounded-lg"
            >
              {/* Imagen */}
              <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 truncate">
                  {item.productName}
                </p>
                <p className="text-sm text-stone-500">
                  {item.variantName} x {item.quantity}
                </p>
              </div>

              {/* Precio */}
              <div className="text-right">
                <p className="font-semibold text-stone-900">
                  ${(item.price * item.quantity).toLocaleString()}
                </p>
                <p className="text-xs text-stone-500">
                  ${item.price.toLocaleString()} c/u
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-stone-50 rounded-xl p-4">
        <h3 className="font-semibold text-stone-900 mb-4">Tus Datos</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Nombre</span>
            <span className="font-medium text-stone-900">
              {formData.customerName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Email</span>
            <span className="font-medium text-stone-900">
              {formData.customerEmail}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Teléfono</span>
            <span className="font-medium text-stone-900">
              {formData.customerPhone}
            </span>
          </div>
        </div>
      </div>

      {/* Entrega */}
      <div className="bg-stone-50 rounded-xl p-4">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-yerba-600" />
          Entrega
        </h3>
        <div className="space-y-2 text-sm">
          {formData.deliveryType === "shipping" ? (
            <>
              <div className="flex justify-between">
                <span className="text-stone-500">Método</span>
                <span className="font-medium text-stone-900">
                  Envío a domicilio
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Dirección</span>
                <span className="font-medium text-stone-900 text-right">
                  {process.env.NEXT_PUBLIC_STORE_ADDRESS ||
                    "Consultá la dirección por WhatsApp"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ciudad</span>
                <span className="font-medium text-stone-900">
                  {formData.city}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">CP</span>
                <span className="font-medium text-stone-900">
                  {formData.zipCode}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-stone-500">Método</span>
                <span className="font-medium text-stone-900">
                  Retiro en local
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Dirección</span>
                <span className="font-medium text-stone-900 text-right">
                  {process.env.NEXT_PUBLIC_STORE_ADDRESS ||
                    "Consultá la dirección por WhatsApp"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pago */}
      <div className="bg-stone-50 rounded-xl p-4">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <PaymentIcon className="h-5 w-5 text-yerba-600" />
          Pago
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Método</span>
            <span className="font-medium text-stone-900">
              {paymentMethodLabels[formData.paymentMethod]?.label}
            </span>
          </div>
          {formData.notes && (
            <div className="pt-2 border-t border-stone-200">
              <span className="text-stone-500 block mb-1">Notas:</span>
              <p className="text-stone-700 italic">
                &ldquo;{formData.notes}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-yerba-600 text-white rounded-xl p-4">
        <h3 className="font-semibold mb-4">Totales</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-yerba-100">Subtotal</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yerba-100">Envío</span>
            <span>
              {shippingCost === 0
                ? "Gratis"
                : shippingCost === null
                  ? "A calcular"
                  : `$${shippingCost.toLocaleString()}`}
            </span>
          </div>
          <div className="border-t border-yerba-500 pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total a pagar</span>
              <span>${finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {shippingCost === null && (
          <p className="text-xs text-yerba-100 mt-3">
            ⚠️ Costo de envío pendiente — ingresá tu CP en el paso anterior
          </p>
        )}
      </div>
    </div>
  );
}
