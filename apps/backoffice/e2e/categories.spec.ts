import { test, expect } from "@playwright/test";

/**
 * CRUD de categorías en el backoffice. Usa storageState admin (project chromium).
 *
 * - El bloque serial crea → edita → elimina una categoría propia (sin productos), que es
 *   el path de borrado limpio (toast de confirmación).
 * - El test de guarda usa una categoría del seed CON productos ("Yerbas") para verificar
 *   que no se puede eliminar (toast de error, sin confirmación).
 */

const RUN = Date.now();
const CAT_NAME = `E2E Cat ${RUN}`;
const CAT_NAME_EDITED = `E2E Cat Editada ${RUN}`;

test.describe.serial("Backoffice · Categoría CRUD", () => {
  test("crea una categoría", async ({ page }) => {
    await page.goto("/categorias");
    await page.getByTestId("new-category-btn").click();
    await page.getByTestId("category-name-input").fill(CAT_NAME);
    await page.getByTestId("category-submit").click();

    await expect(
      page.getByTestId("category-item").filter({ hasText: CAT_NAME }),
    ).toBeVisible();
  });

  test("edita la categoría", async ({ page }) => {
    await page.goto("/categorias");
    const item = page
      .getByTestId("category-item")
      .filter({ hasText: CAT_NAME });
    await expect(item).toBeVisible();
    await item.getByTestId("category-edit").click();

    await page.getByTestId("category-name-input").fill(CAT_NAME_EDITED);
    await page.getByTestId("category-submit").click();

    await expect(
      page.getByTestId("category-item").filter({ hasText: CAT_NAME_EDITED }),
    ).toBeVisible();
  });

  test("elimina la categoría vacía", async ({ page }) => {
    await page.goto("/categorias");
    const item = page
      .getByTestId("category-item")
      .filter({ hasText: CAT_NAME_EDITED });
    await expect(item).toBeVisible();
    await item.getByTestId("category-delete").click();

    // Categoría sin productos → toast de confirmación.
    await page.getByTestId("category-delete-confirm").click();

    await expect(
      page.getByTestId("category-item").filter({ hasText: CAT_NAME_EDITED }),
    ).toHaveCount(0);
  });
});

test("no permite eliminar una categoría con productos", async ({ page }) => {
  await page.goto("/categorias");
  const item = page.getByTestId("category-item").filter({ hasText: "Yerbas" });
  await expect(item).toBeVisible();
  await item.getByTestId("category-delete").click();

  // Guarda: toast de error, sin botón de confirmación; la categoría sigue presente.
  await expect(page.getByText(/No se puede eliminar/i)).toBeVisible();
  await expect(page.getByTestId("category-delete-confirm")).toHaveCount(0);
  await expect(
    page.getByTestId("category-item").filter({ hasText: "Yerbas" }),
  ).toBeVisible();
});
