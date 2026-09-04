import { CheckoutFormData } from "@/schemas/checkout-schema";

export type PublicCheckoutItem = {
  variantId: string;
  quantity: number;
};

/** Body compartido de brick-init y offline-checkout (sin paymentProvider). */
export function buildPublicCheckoutPayload(
  form: CheckoutFormData,
  items: PublicCheckoutItem[],
) {
  return {
    customerEmail: form.customerEmail,
    customerName: form.customerName,
    customerPhone: form.customerPhone || undefined,
    orderItems: items,
    deliveryType: form.deliveryType || undefined,
    shippingStreetName: form.streetName || undefined,
    shippingStreetNumber: form.streetNumber || undefined,
    shippingFloor: form.floor || undefined,
    shippingApartment: form.apartment || undefined,
    shippingCity: form.city || undefined,
    shippingProvinceCode: form.shippingProvinceCode || undefined,
    shippingZip: form.zipCode || undefined,
    shippingCost: form.shippingCost ?? 0,
    shippingProvider: form.shippingProvider || undefined,
    shippingDeliveryType: form.shippingDeliveryType || undefined,
    // Sin esto el server cotiza la tarifa más barata del tipo elegido, no la
    // que tocó el comprador, y el total del Brick no coincide con el resumen.
    shippingProductName: form.shippingProductName || undefined,
    shippingAgencyCode: form.shippingAgencyCode || undefined,
    couponCode: form.couponCode || undefined,
    notes: form.notes || undefined,
  };
}
