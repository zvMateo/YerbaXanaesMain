// 📁 apps/ecommerce/schemas/checkout-schema.ts
// Agents-Ready: Validación estricta con Zod v4

import { z } from "zod";

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
    .min(8, "El teléfono debe tener al menos 8 dígitos")
    .max(20, "El teléfono es demasiado largo")
    .regex(
      /^(?:(?:00|\+)?549?\s?|0)(?:11|[2368]\d)(?:(?:\s?\d{4}){2}|\d{4}[-\s]?\d{4})$/,
      "Ingresá un número válido. Ej: 11 1234-5678 o +54 9 11 1234-5678",
    ),

  // Paso 2: Tipo de entrega
  deliveryType: z.enum(["shipping", "pickup"]),

  // Condicional: Solo si es envío
  address: z
    .string()
    .min(5, "La dirección debe tener al menos 5 caracteres")
    .optional(),

  city: z.string().optional(),

  zipCode: z
    .string()
    .regex(/^\d{4,8}$/, "El código postal debe tener entre 4 y 8 dígitos")
    .optional(),

  // Paso 3: Método de pago
  paymentMethod: z.enum(["mercadopago", "modo", "transfer"]),

  // Cuotas MODO (solo aplica si paymentMethod === "modo")
  modoInstallments: z.number().int().optional(),

  // Costo de envío calculado (lo setea el delivery-step tras cotizar)
  shippingCost: z.number(),
  shippingProvider: z.string(), // "correo_argentino" | "flat_rate" | "pickup"
  shippingProvinceCode: z.string(), // Código de provincia Correo Argentino

  // Cupón de descuento (opcional)
  couponCode: z.string().optional(),
  couponDiscount: z.number().optional(), // Monto a descontar del total

  // Notas adicionales
  notes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional(),
});

export const checkoutSchemaValidated = checkoutSchema.superRefine(
  (data, ctx) => {
    if (data.deliveryType === "shipping") {
      if (!data.address || data.address.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: "La dirección es requerida para envío a domicilio",
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
  address: true,
  city: true,
  zipCode: true,
});

export const paymentSchema = checkoutSchema.pick({
  paymentMethod: true,
  notes: true,
});
