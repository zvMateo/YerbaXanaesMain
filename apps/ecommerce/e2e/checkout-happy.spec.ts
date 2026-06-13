import { test, expect } from "@playwright/test";
import {
  SEED_PRODUCT,
  addProductToCart,
  fillPersonalInfo,
  fetchVariantStock,
} from "./fixtures";

/**
 * Happy path del checkout — Opción B.
 *
 * Recorre el flujo real del cliente: listado → detalle → carrito → checkout con
 * "Retiro en local" (pickup), que saltea la cotización de Correo Argentino y va
 * directo al paso de pago. El límite es el `brick-init` del backend, que crea la
 * orden PENDING y devuelve el `preferenceId`. NO se completa el Brick real de MP
 * (iframe controlado por MP, flaky en CI). El webhook se cubre aparte.
 *
 * Aserciones:
 *  1. `POST /payments/brick-init` responde OK con `preferenceId` y `orderId`.
 *  2. Crear la orden PENDING decrementó el stock del producto en la cantidad comprada.
 */
test("checkout con pickup llega a brick-init con preferenceId y descuenta stock", async ({
  page,
  request,
}) => {
  const stockAntes = await fetchVariantStock(
    request,
    SEED_PRODUCT.slug,
    SEED_PRODUCT.variantName,
  );
  expect(stockAntes).toBeGreaterThan(0);

  // 1. Listado → detalle → agregar al carrito
  await addProductToCart(page, SEED_PRODUCT);

  // 2. Ir al checkout (el carrito persiste en localStorage)
  await page.goto("/checkout");

  // Paso 1: Datos personales
  await expect(
    page.getByRole("heading", { name: "Tus Datos Personales" }),
  ).toBeVisible();
  await fillPersonalInfo(page, {
    name: "Test Cliente E2E",
    email: "e2e@yerbaxanaes.test",
    phone: "351 456-7890",
  });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // Paso 2: Método de entrega → Retiro en local (pickup)
  await expect(
    page.getByRole("heading", { name: "Método de Entrega" }),
  ).toBeVisible();
  await page.getByText("Retiro en local").click();
  // Confirmación inline de pickup
  await expect(
    page.getByText("Listo, no necesitás cargar más datos"),
  ).toBeVisible();

  // Al continuar desde pickup, el form salta directo al paso de Pago, que monta el
  // PaymentBrick y dispara brick-init. Interceptamos esa respuesta.
  const brickInitResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/payments/brick-init") &&
      r.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Continuar al pago" }).click();

  const response = await brickInitResponse;
  expect(
    response.ok(),
    `brick-init respondió ${response.status()}`,
  ).toBeTruthy();

  const body = (await response.json()) as {
    data?: { preferenceId?: string; orderId?: string };
  };
  expect(body.data?.preferenceId, "falta preferenceId").toBeTruthy();
  expect(body.data?.orderId, "falta orderId").toBeTruthy();

  // 3. La orden PENDING decrementó el stock en la cantidad comprada (1)
  const stockDespues = await fetchVariantStock(
    request,
    SEED_PRODUCT.slug,
    SEED_PRODUCT.variantName,
  );
  expect(stockDespues).toBe(stockAntes - 1);
});

test("el checkout redirige a productos cuando el carrito está vacío", async ({
  page,
}) => {
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Tu carrito está vacío" }),
  ).toBeVisible();
});
