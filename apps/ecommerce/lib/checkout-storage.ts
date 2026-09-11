/**
 * Claves y helpers del checkout persistido en localStorage.
 *
 * Viven acá porque las escriben dos componentes distintos (el formulario y el
 * cleanup de la pantalla de éxito) y una tercera clave que se olvide de
 * limpiar deja al comprador reusando una orden que ya no corresponde.
 */

/** Datos del formulario (nombre, dirección, medio de pago elegido). */
export const CHECKOUT_STORAGE_KEY = "yerbaxanaes-checkout-data";

/** Paso en el que quedó el checkout. */
export const CHECKOUT_STEP_KEY = "yerbaxanaes-checkout-step";

/**
 * Orden PENDING ya creada por brick-init.
 *
 * Sin esto, refrescar en el paso de pago pierde el `orderId` (vive en estado
 * React) y dispara otro brick-init: otra orden y otro descuento de stock.
 */
export const CHECKOUT_ORDER_KEY = "yerbaxanaes-checkout-order";

/**
 * Ventana de reutilización. Queda por debajo del TTL de carritos abandonados
 * del server (`MP_CART_ABANDONED_TTL_MINUTES`, 15 min por defecto): pasado ese
 * plazo el cleanup cancela la orden, y reusar un id cancelado sólo produce un
 * error que el comprador no puede resolver.
 */
const ORDER_MAX_AGE_MS = 10 * 60_000;

export interface PersistedCheckoutOrder {
  orderId: string;
  preferenceId: string | null;
  /** Carrito con el que se creó la orden. */
  cartFingerprint: string;
  savedAt: number;
}

/**
 * Huella del carrito que originó la orden.
 *
 * El server cotiza la orden reutilizada desde el snapshot de sus propios
 * ítems, así que si el carrito cambió, ese id ya no representa lo que el
 * comprador ve en pantalla. Comparar la huella evita reusarlo.
 */
export function cartFingerprint(
  items: { variantId: string; quantity: number }[],
): string {
  return items
    .map((item) => `${item.variantId}x${item.quantity}`)
    .sort()
    .join("|");
}

/**
 * Lee la orden en curso. Devuelve null si no hay, está corrupta, venció, o si
 * el carrito dejó de coincidir con el que la originó.
 */
export function readCheckoutOrder(
  currentCartFingerprint: string,
): PersistedCheckoutOrder | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_ORDER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedCheckoutOrder>;
    if (typeof parsed?.orderId !== "string" || !parsed.orderId) return null;
    if (parsed.cartFingerprint !== currentCartFingerprint) return null;
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > ORDER_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      orderId: parsed.orderId,
      preferenceId:
        typeof parsed.preferenceId === "string" ? parsed.preferenceId : null,
      cartFingerprint: parsed.cartFingerprint,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

/** Guarda la orden en curso. Sin storage el checkout sigue, sólo pierde la reanudación. */
export function writeCheckoutOrder(order: PersistedCheckoutOrder): void {
  try {
    localStorage.setItem(CHECKOUT_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Modo incógnito o cuota llena: no es crítico.
  }
}

/** Borra todo el checkout persistido. Se llama al confirmar el pago. */
export function clearCheckoutStorage(): void {
  try {
    localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_STEP_KEY);
    localStorage.removeItem(CHECKOUT_ORDER_KEY);
  } catch {
    // Idem.
  }
}
