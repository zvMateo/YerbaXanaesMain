/**
 * Fuente única de datos públicos de marca y contacto.
 * No hardcodear email, teléfono, dirección ni redes en componentes.
 * WhatsApp y redes salen de env: si faltan, se oculta el enlace (nunca un fallback inventado).
 */

function envUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const brand = {
  name: "YerbaXanaes",
  city: "Villa del Rosario",
  province: "Córdoba",
  postalCode: "5963",
  country: "Argentina",
  email: "hola@yerbaxanaes.com",
  siteUrl: envUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://yerbaxanaes.com",
  whatsappUrl:
    envUrl(process.env.NEXT_PUBLIC_SHIPPING_WHATSAPP_URL) ||
    envUrl(process.env.NEXT_PUBLIC_WHATSAPP_URL),
  storeAddress: envUrl(process.env.NEXT_PUBLIC_STORE_ADDRESS) ?? "25 de Mayo 1572, Villa del Rosario",
  instagramUrl: envUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL) ?? "https://www.instagram.com/yerbaxanaes/",
  facebookUrl: envUrl(process.env.NEXT_PUBLIC_FACEBOOK_URL),
};

export const PICKUP_ADDRESS_FALLBACK = "Consultá la dirección por WhatsApp";

export function pickupAddress(): string {
  return brand.storeAddress ?? PICKUP_ADDRESS_FALLBACK;
}

export function locationLine(): string {
  return `${brand.city}, ${brand.province}`;
}

export function locationLineWithPostal(): string {
  return `${brand.city}, ${brand.province}, CP ${brand.postalCode}`;
}

export function mailtoHref(subject?: string): string {
  if (!subject) return `mailto:${brand.email}`;
  return `mailto:${brand.email}?subject=${encodeURIComponent(subject)}`;
}

/**
 * Teléfono para mostrar a partir de una URL wa.me.
 * No inventa un número: si no hay WhatsApp configurado, devuelve null.
 */
export function displayWhatsAppPhone(
  url: string | null = brand.whatsappUrl,
): string | null {
  if (!url) return null;
  const match = url.match(/wa\.me\/(\d+)/i);
  if (!match) return null;
  const digits = match[1];

  if (digits.startsWith("549") && digits.length >= 11) {
    const national = digits.slice(3);
    if (national.startsWith("11") && national.length === 10) {
      return `+54 9 11 ${national.slice(2, 6)}-${national.slice(6)}`;
    }
    if (national.length === 10) {
      return `+54 9 ${national.slice(0, 4)} ${national.slice(4)}`;
    }
    return `+54 9 ${national}`;
  }

  if (digits.startsWith("54") && digits.length > 2) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }

  return `+${digits}`;
}

/** Href de WhatsApp. Si pasás prefill, reemplaza el `text` de la URL de env. */
export function whatsappHref(prefill?: string): string | null {
  const base = brand.whatsappUrl;
  if (!base) return null;
  if (!prefill) return base;

  const qIndex = base.indexOf("?");
  const origin = qIndex >= 0 ? base.slice(0, qIndex) : base;
  return `${origin}?text=${encodeURIComponent(prefill)}`;
}
