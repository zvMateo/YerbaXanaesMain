import { test, expect } from "@playwright/test";

/**
 * CRUD de productos en el backoffice. Usa storageState admin (project chromium).
 *
 * - El bloque serial crea → edita → elimina un producto propio (sin órdenes), así no
 *   muta datos del seed y el path de borrado limpio queda cubierto.
 * - El test de guarda usa un producto del seed CON órdenes ("Mate Camionero Uruguayo",
 *   orden PAID) para verificar que no se puede eliminar y se fuerza desactivar.
 */

const RUN = Date.now();
const PRODUCT_NAME = `E2E Producto ${RUN}`;
const PRODUCT_NAME_EDITED = `E2E Producto Editado ${RUN}`;

test.describe.serial("Backoffice · Producto CRUD", () => {
  test("crea un producto pre-empacado", async ({ page }) => {
    await page.goto("/productos");
    await page.getByTestId("new-product-btn").click();

    const modal = page.getByTestId("product-form-modal");
    await expect(modal).toBeVisible();

    await page.getByTestId("product-name-input").fill(PRODUCT_NAME);
    await page
      .getByTestId("product-category-select")
      .selectOption({ label: "Accesorios" });
    await page.getByTestId("variant-name").first().fill("Estándar");
    await page.getByTestId("variant-price").first().fill("9900");
    await page.getByTestId("variant-stock").first().fill("25");

    await page.getByTestId("product-submit").click();

    // En creación el modal queda abierto en modo edición con confirmación de éxito.
    await expect(
      page.getByText("¡Producto guardado exitosamente!"),
    ).toBeVisible();
    // Scope al modal + exact: si no, "Cerrar" colisiona con "Cerrar sesión" del sidebar.
    await modal.getByRole("button", { name: "Cerrar", exact: true }).click();

    await expect(
      page.getByTestId("product-card").filter({ hasText: PRODUCT_NAME }),
    ).toBeVisible();
  });

  test("edita el producto creado", async ({ page }) => {
    await page.goto("/productos");
    const card = page
      .getByTestId("product-card")
      .filter({ hasText: PRODUCT_NAME });
    await expect(card).toBeVisible();

    await card.getByTestId("product-actions-trigger").click();
    await page.getByTestId("product-edit").click();

    const modal = page.getByTestId("product-form-modal");
    await expect(modal).toBeVisible();
    await page.getByTestId("product-name-input").fill(PRODUCT_NAME_EDITED);
    await page.getByTestId("product-submit").click();

    await expect(modal).toBeHidden();
    await expect(
      page.getByTestId("product-card").filter({ hasText: PRODUCT_NAME_EDITED }),
    ).toBeVisible();
    await expect(
      page.getByTestId("product-card").filter({ hasText: PRODUCT_NAME }),
    ).toHaveCount(0);
  });

  test("elimina el producto creado (sin órdenes)", async ({ page }) => {
    await page.goto("/productos");
    const card = page
      .getByTestId("product-card")
      .filter({ hasText: PRODUCT_NAME_EDITED });
    await expect(card).toBeVisible();

    await card.getByTestId("product-actions-trigger").click();
    await page.getByTestId("product-delete").click();

    // Sin órdenes → el modal permite eliminar.
    await page.getByTestId("product-delete-confirm").click();

    await expect(
      page.getByTestId("product-card").filter({ hasText: PRODUCT_NAME_EDITED }),
    ).toHaveCount(0);
  });
});

test("no permite eliminar un producto con órdenes (fuerza desactivar)", async ({
  page,
}) => {
  await page.goto("/productos");
  const card = page
    .getByTestId("product-card")
    .filter({ hasText: "Mate Camionero Uruguayo" });
  await expect(card).toBeVisible();

  await card.getByTestId("product-actions-trigger").click();
  await page.getByTestId("product-delete").click();

  // Guarda: el modal advierte y ofrece desactivar, no eliminar.
  await expect(page.getByText(/no puede eliminarse/i)).toBeVisible();
  await expect(page.getByTestId("product-deactivate")).toBeVisible();
  await expect(page.getByTestId("product-delete-confirm")).toHaveCount(0);

  await page.getByRole("button", { name: "Cancelar" }).click();
});
