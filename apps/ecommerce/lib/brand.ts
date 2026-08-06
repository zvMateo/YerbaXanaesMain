/**
 * Fuente única de datos de marca / contacto del ecommerce.
 * Cambiá acá → footer, contacto, WhatsApp de envíos y schema se alinean.
 */

export const brand = {
  businessName: "YerbaXanaes",
  tagline:
    "Llevando la tradición del mate argentino a tu hogar con la mejor calidad y sabor.",

  // Ubicación
  city: "Villa del Rosario",
  region: "Córdoba",
  country: "Argentina",
  locationLabel: "Villa del Rosario, Córdoba, Argentina",

  // Contacto
  email: "yerbaxanaes@gmail.com",
  hours: "Lun–Vie 9 a 18 hs",

  // WhatsApp (E.164 sin + para wa.me)
  whatsappE164: "5493573500348",
  whatsappDisplay: "+54 9 3573 50-0348",

  // Redes: null = no mostrar en UI (evitar href="#")
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },

  freeShippingFromArs: 15_000,
} as const;

/** URL WhatsApp con mensaje vacío (consulta general). */
export function whatsappUrl(prefilledText?: string): string {
  const base = `https://wa.me/${brand.whatsappE164}`;
  if (!prefilledText) return base;
  return `${base}?text=${encodeURIComponent(prefilledText)}`;
}

/** Cotización de envío (fallback si falla Correo Argentino). */
export function shippingWhatsappUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SHIPPING_WHATSAPP_URL?.trim();
  if (fromEnv) return fromEnv;
  return whatsappUrl(
    "Hola, necesito cotizar el envío de mi pedido de YerbaXanaes",
  );
}

export function mailtoUrl(subject?: string): string {
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${brand.email}${q}`;
}
