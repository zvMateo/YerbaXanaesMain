import { useSyncExternalStore } from "react";

/** Nunca notifica: el valor solo cambia entre servidor y cliente. */
const neverChanges = () => () => {};

/**
 * `false` mientras renderiza el servidor y durante la primera hidratacion,
 * `true` despues.
 *
 * Sirve para postergar al cliente lo que depende de APIs del browser sin el
 * par useState + useEffect, que provoca un render extra en cascada apenas
 * monta el componente.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}
