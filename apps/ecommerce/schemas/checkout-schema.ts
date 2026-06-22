// 📁 apps/ecommerce/schemas/checkout-schema.ts
// Agents-Ready: Validación estricta con Zod v4

import { z } from "zod";

// Provincias argentinas — códigos de Correo Argentino
export const PROVINCES = [
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

// Zod v4: Nuevos métodos de validación
export const checkoutSchema = z.object({
  // Paso 1: Datos personales
  customerName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre es demasiado largo"),

  customerEmail: z.email("Ingresá un email válido"),

  customerPhone: z
    .string()
    .trim()
    .min(8, "Ingresá tu número de teléfono")
    .max(25, "El teléfono es demasiado largo")
    .refine(
      (val) => {
        // Validación permisiva: contamos solo los dígitos para aceptar
        // cualquier formato AR (con/sin +54, 9, 0, espacios, guiones, paréntesis).
        // Un número nacional son 10 dígitos; hasta 15 con prefijos internacionales.
        const digits = val.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15;
      },
      "Ingresá un número válido. Ej: 351 456-7890 o +54 9 351 456-7890",
    ),

  // Paso 2: Tipo de entrega
  deliveryType: z.enum(["shipping", "pickup"]),

  // Dirección estructurada (preferida — campos separados para MiCorreo)
  streetName: z
    .string()
    .min(2, "La calle debe tener al menos 2 caracteres")
    .max(100)
    .optional(),
  streetNumber: z.string().max(20).optional(),
  floor: z.string().max(10).optional(),
  apartment: z.string().max(10).optional(),

  city: z.string().optional(),

  zipCode: z
    .string()
    .regex(/^\d{4,8}$/, "El código postal debe tener entre 4 y 8 dígitos")
    .optional(),

  // Paso 3: Método de pago — ecommerce usa solo Mercado Pago Payment Brick
  paymentMethod: z.enum(["mercadopago"]),

  // Costo de envío calculado (lo setea el delivery-step tras cotizar)
  shippingCost: z.number().min(0, "El costo de envío no puede ser negativo"),
  shippingProvider: z.string(), // "correo_argentino" | "manual_quote_required" | "pickup"
  shippingProvinceCode: z.string(), // Código de provincia Correo Argentino

  // Tipo de envío Correo Argentino: "D" (domicilio) o "S" (sucursal).
  // Vacío cuando es pickup o todavía no se eligió.
  shippingDeliveryType: z.enum(["D", "S", ""]).optional(),

  // Sucursal seleccionada — requerida si shippingDeliveryType === "S"
  shippingAgencyCode: z.string().optional(),
  shippingAgencyName: z.string().optional(), // Para mostrar en el resumen

  // Producto Correo elegido (ej: "Correo Argentino Clasico" o "Correo Argentino Expreso").
  // Sirve para distinguir entre las 2 tarifas del mismo deliveredType.
  shippingProductName: z.string().optional(),

  // Cupón de descuento (opcional)
  couponCode: z.string().optional(),
  couponDiscount: z
    .number()
    .min(0, "El descuento no puede ser negativo")
    .optional(), // Monto a descontar del total

  // Notas adicionales
  notes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional(),
});

export const checkoutSchemaValidated = checkoutSchema.superRefine(
  (data, ctx) => {
    if (data.deliveryType === "shipping") {
      if (!data.streetName || data.streetName.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["streetName"],
          message: "La calle es requerida",
        });
      }
      if (!data.streetNumber) {
        ctx.addIssue({
          code: "custom",
          path: ["streetNumber"],
          message: "La altura es requerida",
        });
      }
      if (!data.city || data.city.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: "La ciudad es requerida",
        });
      }
      if (!data.zipCode) {
        ctx.addIssue({
          code: "custom",
          path: ["zipCode"],
          message: "El código postal es requerido",
        });
      }
      if (!data.shippingProvinceCode) {
        ctx.addIssue({
          code: "custom",
          path: ["shippingProvinceCode"],
          message: "La provincia es requerida",
        });
      }
      // Si el cliente eligió retirar en sucursal, exigir código de sucursal
      if (data.shippingDeliveryType === "S" && !data.shippingAgencyCode) {
        ctx.addIssue({
          code: "custom",
          path: ["shippingAgencyCode"],
          message: "Seleccioná una sucursal para retirar tu envío",
        });
      }
    }
  },
);

// Tipo inferido del schema
export type CheckoutFormData = z.infer<typeof checkoutSchemaValidated>;

// Validación por pasos
export const personalInfoSchema = checkoutSchema.pick({
  customerName: true,
  customerEmail: true,
  customerPhone: true,
});

export const deliverySchema = checkoutSchema.pick({
  deliveryType: true,
  streetName: true,
  streetNumber: true,
  floor: true,
  apartment: true,
  city: true,
  zipCode: true,
  shippingProvinceCode: true,
  shippingDeliveryType: true,
  shippingAgencyCode: true,
});

export const paymentSchema = checkoutSchema.pick({
  paymentMethod: true,
  notes: true,
});
