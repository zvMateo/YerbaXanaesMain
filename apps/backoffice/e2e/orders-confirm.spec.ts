import { test, expect, type Page } from "@playwright/test";

/**
 * Confirmación de acciones destructivas sobre pedidos (Fase 6, Tarea 6.3).
 *
 * Usa las dos órdenes del seed: PENDING de "Pepe Efectivo" ($4.500) y PAID de
 * "Laura Cliente" ($33.500). El último test confirma de verdad y muta el seed,
 * así que el bloque es serial y va al final; el global-setup repuebla en la
 * corrida siguiente.
 *
 * El botón de cerrar del diálogo dice "Volver", no "Cancelar": si dijera
 * "Cancelar" colisionaría con la acción que se está confirmando.
 */

const PENDING_CUSTOMER = "Pepe Efectivo";
const PAID_CUSTOMER = "Laura Cliente";

function orderRow(page: Page, customer: string) {
  return page.getByRole("row").filter({ hasText: customer });
}

test.describe.serial("Backoffice · acciones destructivas de pedidos", () => {
  test("cancelar pide confirmación con el nombre y el monto", async ({
    page,
  }) => {
    await page.goto("/ordenes");

    const row = orderRow(page, PENDING_CUSTOMER);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Cancelar", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("¿Cancelar este pedido?");
    await expect(dialog).toContainText(PENDING_CUSTOMER);
    await expect(dialog).toContainText("4.500");
    await expect(dialog).toContainText("El stock vuelve al inventario");

    // Volver atrás no dispara la mutación.
    await dialog.getByRole("button", { name: "Volver" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("Pendiente");
  });

  test("reembolsar pide confirmación y aclara que el dinero va por fuera", async ({
    page,
  }) => {
    await page.goto("/ordenes");

    const row = orderRow(page, PAID_CUSTOMER);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Reembolsar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("¿Marcar como reembolsado?");
    await expect(dialog).toContainText(PAID_CUSTOMER);
    await expect(dialog).toContainText("33.500");
    await expect(dialog).toContainText("por fuera del panel");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(row).toContainText("Pagado");
  });

  test("la acción masiva dice cuántos pedidos afecta", async ({ page }) => {
    await page.goto("/ordenes");

    await orderRow(page, PENDING_CUSTOMER).getByRole("checkbox").check();
    await orderRow(page, PAID_CUSTOMER).getByRole("checkbox").check();

    await page.getByRole("button", { name: "Cancelar seleccionadas" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("¿Cancelar 2 pedidos?");

    await dialog.getByRole("button", { name: "Volver" }).click();
    await expect(dialog).toBeHidden();
    await expect(orderRow(page, PENDING_CUSTOMER)).toContainText("Pendiente");
  });

  test("confirmar cancela el pedido de verdad", async ({ page }) => {
    await page.goto("/ordenes");

    const row = orderRow(page, PENDING_CUSTOMER);
    await row.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByTestId("confirm-dialog-confirm").click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(orderRow(page, PENDING_CUSTOMER)).toContainText("Cancelado");
  });
});
