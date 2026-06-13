import { test, expect, APIRequestContext } from "@playwright/test";
import crypto from "node:crypto";
import { API_URL, buildMpSignature, getWebhookSecret } from "./fixtures";

/**
 * Seguridad del webhook de Mercado Pago — capa HTTP completa.
 *
 * El controller convierte cualquier rechazo de firma en HTTP 200 `{status:'ok'}`
 * (para que MP no reintente notificaciones inválidas). Por eso no se puede distinguir
 * "aceptado" vs "rechazado" por el status code. Lo observamos por el DEDUP:
 *
 *  - Una firma VÁLIDA crea una fila en `webhookLog` → un replay con el mismo
 *    requestId devuelve `{status:'already_processed'}`.
 *  - Una firma INVÁLIDA/expirada/ausente es rechazada ANTES de loguear → el replay
 *    nunca devuelve `already_processed`.
 *
 * Así probamos, en caja negra y sólo por HTTP, que la barrera de firma se aplica de
 * verdad (incluyendo la carga real de MP_WEBHOOK_SECRET vía ConfigService).
 *
 * El happy-path del webhook (orden → PAID + stock) NO se testea acá: el handler hace
 * un fetch real a api.mercadopago.com para confirmar el pago, lo que exigiría un pago
 * real de sandbox. Esa lógica está cubierta por el unit test de Jest (payments.service.spec.ts).
 */

interface WebhookResult {
  status: number;
  body: { status?: string };
}

async function postWebhook(
  request: APIRequestContext,
  opts: { dataId: string; requestId: string; signature: string; type?: string },
): Promise<WebhookResult> {
  const type = opts.type ?? "payment";
  const res = await request.post(`${API_URL}/payments/webhook`, {
    params: { "data.id": opts.dataId, type },
    headers: {
      "x-signature": opts.signature,
      "x-request-id": opts.requestId,
      "content-type": "application/json",
    },
    data: { type, data: { id: opts.dataId } },
    failOnStatusCode: false,
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string };
  return { status: res.status(), body };
}

test("webhook con firma VÁLIDA pasa la barrera y es idempotente (dedup)", async ({
  request,
}) => {
  const secret = getWebhookSecret();
  const dataId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const ts = Math.floor(Date.now() / 1000);
  const signature = buildMpSignature({ secret, dataId, requestId, ts });

  // 1er envío: firma válida → pasa la barrera y registra el webhook (el pago no existe
  // en MP, así que la orden no se toca, pero la fila de dedup queda creada).
  const first = await postWebhook(request, { dataId, requestId, signature });
  expect(first.status).toBe(200);

  // 2do envío idéntico: el dedup lo detecta → already_processed.
  const second = await postWebhook(request, { dataId, requestId, signature });
  expect(second.status).toBe(200);
  expect(second.body.status).toBe("already_processed");
});

test("webhook SIN firma es rechazado (nunca llega al dedup)", async ({
  request,
}) => {
  const dataId = crypto.randomUUID();
  const requestId = crypto.randomUUID();

  const first = await postWebhook(request, { dataId, requestId, signature: "" });
  expect(first.status).toBe(200); // el controller traga el rechazo como 200

  // Si se hubiese procesado, el replay daría already_processed. No debe pasar.
  const second = await postWebhook(request, { dataId, requestId, signature: "" });
  expect(second.body.status).not.toBe("already_processed");
});

test("webhook con firma HMAC inválida es rechazado", async ({ request }) => {
  const dataId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const ts = Math.floor(Date.now() / 1000);
  // Hash arbitrario: no corresponde al manifest → HMAC inválido.
  const signature = `ts=${ts},v1=${"0".repeat(64)}`;

  const first = await postWebhook(request, { dataId, requestId, signature });
  expect(first.status).toBe(200);

  const second = await postWebhook(request, { dataId, requestId, signature });
  expect(second.body.status).not.toBe("already_processed");
});

test("webhook con timestamp expirado es rechazado (anti-replay)", async ({
  request,
}) => {
  const secret = getWebhookSecret();
  const dataId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  // 10 minutos atrás — fuera de la ventana anti-replay de 5 min.
  const expiredTs = Math.floor(Date.now() / 1000) - 10 * 60;
  // Firma correcta para ese manifest, pero el ts viejo la invalida igual.
  const signature = buildMpSignature({ secret, dataId, requestId, ts: expiredTs });

  const first = await postWebhook(request, { dataId, requestId, signature });
  expect(first.status).toBe(200);

  const second = await postWebhook(request, { dataId, requestId, signature });
  expect(second.body.status).not.toBe("already_processed");
});
