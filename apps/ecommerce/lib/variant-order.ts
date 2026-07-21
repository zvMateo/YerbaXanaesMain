import type { ProductVariant } from "@repo/types";

/**
 * Extrae el peso en gramos del nombre de una variante:
 * "500g" → 500, "1kg" → 1000, "1,5kg"/"1.5kg" → 1500, "Barbacuá 2kg" → 2000.
 * Devuelve null si el nombre no contiene un token de peso reconocible.
 */
function parseWeightGrams(name: string): number | null {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;

  return match[2].toLowerCase() === "kg" ? value * 1000 : value;
}

/**
 * Ordena las variantes por peso ascendente para que los tamaños se muestren
 * siempre en el mismo orden (500g → 1kg → 1,5kg → 2kg…), sin depender del
 * orden en que la API devuelve las variantes.
 *
 * El peso sale del `name` (lo que ve el usuario en el chip); si no se puede
 * parsear cae al campo `weight`, y si tampoco hay, la variante va al final
 * conservando su orden relativo. Devuelve un array nuevo — no muta el original.
 */
export function sortVariantsBySize(
  variants: ProductVariant[],
): ProductVariant[] {
  const sortKey = (v: ProductVariant): number =>
    parseWeightGrams(v.name) ?? v.weight ?? Number.POSITIVE_INFINITY;

  // Array.prototype.sort es estable (ES2019+): los empates mantienen su orden.
  return [...variants].sort((a, b) => sortKey(a) - sortKey(b));
}
