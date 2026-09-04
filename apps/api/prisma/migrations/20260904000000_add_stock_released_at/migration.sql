-- Marca cuándo se devolvió el stock de una orden al inventario.
-- Null = sigue reservado. Hace idempotente la liberación: cancelar dos veces
-- no duplica la devolución.
ALTER TABLE "Order" ADD COLUMN "stockReleasedAt" TIMESTAMP(3);

-- Backfill de órdenes históricas.
--
-- Las órdenes ya terminales nunca van a liberar stock, así que se marcan como
-- liberadas para que el código nuevo no las toque. No hay forma de saber desde
-- los datos cuáles devolvieron stock de verdad: un REFUNDED puesto a mano desde
-- el backoffice hace un update plano y no restaura nada.
--
-- Se elige a propósito el error hacia el lado seguro: marcar de más significa
-- que el sistema puede subcontar stock (se corrige con un conteo físico);
-- marcar de menos permitiría devolver stock dos veces y habilitar sobreventa.
--
-- REJECTED queda afuera adrede: hoy nada lo setea automáticamente, y puesto a
-- mano no restaura stock, así que esas órdenes siguen reservadas.
UPDATE "Order"
SET "stockReleasedAt" = COALESCE("updatedAt", NOW())
WHERE "status" IN ('CANCELLED', 'REFUNDED')
   OR "deletedAt" IS NOT NULL;
