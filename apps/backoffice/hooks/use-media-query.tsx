import { useCallback, useSyncExternalStore } from "react";

/**
 * Lee una media query sin estado ni efecto propio.
 *
 * La version anterior tenia `matches` en las dependencias del efecto, asi que
 * cada cambio de la query volvia a correr el efecto y re-suscribia el listener.
 * useSyncExternalStore es la API de React para leer de una fuente externa y de
 * paso resuelve la hidratacion: en el servidor no hay `window`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  // Sin window asumimos que no matchea, igual que el useState(false) anterior.
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
