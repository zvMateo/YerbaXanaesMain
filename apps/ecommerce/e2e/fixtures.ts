import { APIRequestContext, Page, expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

/**
 * Producto determinista del seed (apps/api/prisma/seed.ts).
 * "Bombilla Pico de Loro" usa stock DIRECTO (sin receta de inventario), así el happy
 * path no depende del cálculo de stock virtual ni de cotizar envío. Estable y simple.
 */
export const SEED_PRODUCT = {
  slug: "bombilla-pico-loro",
  name: "Bombilla Pico de Loro",
  variantName: "Estándar",
  price: 8500,
} as const;

export interface CatalogVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  variants: CatalogVariant[];
}

/** Lee el catálogo y devuelve un producto por slug. Tolera envelope {data} o array directo. */
export async function fetchProductBySlug(
  request: APIRequestContext,
  slug: string,
): Promise<CatalogProduct> {
  const res = await request.get(`${API_URL}/catalog`);
  expect(res.ok(), `GET /catalog respondió ${res.status()}`).toBeTruthy();
  const json: unknown = await res.json();
  const list = (Array.isArray(json)
    ? json
    : (json as { data?: CatalogProduct[] })?.data) as CatalogProduct[];
  const product = list?.find((p) => p.slug === slug);
  expect(product, `El producto "${slug}" no está en /catalog`).toBeTruthy();
  return product!;
}

/** Stock de una variante puntual (por nombre) leído del catálogo. */
export async function fetchVariantStock(
  request: APIRequestContext,
  slug: string,
  variantName: string,
): Promise<number> {
  const product = await fetchProductBySlug(request, slug);
  const variant = product.variants.find((v) => v.name === variantName);
  expect(variant, `Variante "${variantName}" no encontrada en "${slug}"`).toBeTruthy();
  return variant!.stock;
}

/**
 * Navega el listado real y agrega el producto al carrito desde su página de detalle.
 * El carrito (Zustand + persist) queda en localStorage, así /checkout lo levanta.
 */
export async function addProductToCart(
  page: Page,
  product: { slug: string; name: string },
): Promise<void> {
  // Listado: valida que el catálogo carga y muestra el producto
  await page.goto("/productos");
  await expect(
    page.getByRole("heading", { name: product.name }).first(),
  ).toBeVisible();

  // Detalle (el card linkea por slug) → agregar al carrito
  await page.goto(`/productos/${product.slug}`);
  const addBtn = page.getByRole("button", { name: /Agregar al carrito/i });
  await expect(addBtn).toBeEnabled();
  await addBtn.click();
  // Confirmación visual: el botón muta a "¡Agregado!"
  await expect(page.getByText("¡Agregado!")).toBeVisible();
}

export interface CheckoutPersonalInfo {
  name: string;
  email: string;
  phone: string;
}

/** Completa el paso 1 (datos personales) del checkout. Los inputs se ubican por placeholder. */
export async function fillPersonalInfo(
  page: Page,
  info: CheckoutPersonalInfo,
): Promise<void> {
  await page.getByPlaceholder("Ej: María González").fill(info.name);
  await page.getByPlaceholder("Ej: maria@email.com").fill(info.email);
  await page.getByPlaceholder("Ej: 11 1234-5678").fill(info.phone);
}

/**
 * Genera el header `x-signature` de un webhook de Mercado Pago.
 * Manifest según doc MP (igual que payments.service.ts):
 *   `id:<dataId-lower>;request-id:<requestId>;ts:<ts>;`
 */
export function buildMpSignature(opts: {
  secret: string;
  dataId: string;
  requestId: string;
  ts: number;
}): string {
  const manifest = `id:${opts.dataId.toLowerCase()};request-id:${opts.requestId};ts:${opts.ts};`;
  const hash = crypto
    .createHmac("sha256", opts.secret)
    .update(manifest)
    .digest("hex");
  return `ts=${opts.ts},v1=${hash}`;
}

/**
 * Obtiene MP_WEBHOOK_SECRET: primero del env del runner, sino lo parsea de apps/api/.env
 * (el mismo archivo que carga la API levantada por el webServer de Playwright).
 */
export function getWebhookSecret(): string {
  if (process.env.MP_WEBHOOK_SECRET) return process.env.MP_WEBHOOK_SECRET;

  const envPath = path.resolve(process.cwd(), "../api/.env");
  const content = fs.readFileSync(envPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((l) => l.startsWith("MP_WEBHOOK_SECRET="));
  const value = line?.slice("MP_WEBHOOK_SECRET=".length).trim().replace(/^["']|["']$/g, "");
  if (!value) {
    throw new Error("No se pudo resolver MP_WEBHOOK_SECRET (ni env ni apps/api/.env)");
  }
  return value;
}
