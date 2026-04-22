"use client";

/**
 * Re-exporta StatusScreenBrick con dynamic import (ssr: false).
 * Necesario porque next/dynamic con ssr:false solo puede usarse
 * dentro de un Client Component, no en páginas Server Component.
 */
import dynamic from "next/dynamic";

export const StatusScreenBrick = dynamic(
  () =>
    import("./status-screen").then((m) => m.StatusScreenBrick),
  { ssr: false, loading: () => null },
);
