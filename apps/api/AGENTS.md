# AGENTS.md — apps/api (NestJS 11)

Reglas de la API. **Complementa** el `AGENTS.md` de la raíz, no lo reemplaza: stack,
comandos, contratos, seguridad y estilo del proyecto están allá.

Referencia completa con ejemplos: el skill **`nestjs-best-practices`** del repo
(`.agents/skills/nestjs-best-practices/` — `SKILL.md` para el índice, `AGENTS.md` para el detalle).
Abrila **bajo demanda** cuando una regla de acá no alcance. No la cargues entera por defecto.
Los `[N.N]` de abajo son los IDs de esa referencia.

> ⚠️ La guía original está escrita para **TypeORM**. Este repo usa **Prisma**.
> Las reglas de datos de abajo ya están traducidas — ignorá los ejemplos de TypeORM
> (`Repository`, `QueryBuilder`, `DataSource.transaction`, migraciones `MigrationInterface`).

---

## Ya cubierto en la raíz — no repetir

DTOs con `class-validator` · `select`/`include` explícito en Prisma · `$transaction` en mutaciones
multi-paso · `NotFoundException`/`BadRequestException` en vez de `throw new Error` · soft delete en
órdenes (`deletedAt`) · envelope `{ data, meta?, message? }` · feature folders · kebab-case.

---

## Arquitectura — CRÍTICO

- **Nunca dependencias circulares entre módulos** `[1.1]`. Si `orders` necesita `catalog` y viceversa:
  extraé lo común a un tercer módulo, o desacoplá con `@nestjs/event-emitter`. `forwardRef` es un
  parche que tapa un problema de diseño, no la solución.
- **Un provider se declara en UN solo módulo y se exporta** `[1.3]`. Declararlo en dos módulos crea
  **dos instancias distintas**: estado que no se sincroniza y memoria duplicada. Importá el módulo,
  nunca el service suelto.
- **`@Global()` solo para transversales reales** `[1.3]` — config, logger, `PrismaService`. Todo lo
  demás global esconde dependencias y complica los tests.
- **Un service, una responsabilidad** `[1.4]`. Si el nombre lleva "And" o toca dos dominios, partilo.
  La orquestación entre dominios va en el controller o en un service orquestador explícito.
- **Eventos para efectos secundarios** `[1.5]`. Que `orders` no conozca a `notifications`,
  `inventory` y analytics: emitir `order.created` y que cada módulo escuche. Agregar un consumidor
  nuevo no debería tocar `OrdersService`.

## Inyección de dependencias — CRÍTICO

- **Siempre inyección por constructor** `[2.4]`. Nada de `@Inject()` en propiedades salvo
  dependencias `@Optional()`.
- **Nunca `ModuleRef.get()` para resolver dependencias normales** `[2.1]`. Esconde el grafo y rompe
  los tests. Válido solo en factories que eligen implementación en runtime.
- **Cuidado con `Scope.REQUEST`** `[2.5]`. Se propaga hacia arriba por todo el árbol de dependencias
  y mata la performance. Para contexto de request usá `nestjs-cls`, que deja los services singleton.
- **Un singleton nunca guarda estado del request** `[2.5]`. Un campo mutable en un service default
  se comparte entre todos los requests concurrentes → devolvés datos del usuario equivocado.
- **Interfaces necesitan token** `[2.6]`: `Symbol` + `@Inject(TOKEN)`, o clase abstracta. Las
  interfaces de TS no existen en runtime.
- **Interfaces chicas por capacidad** `[2.2]` y **implementaciones sustituibles** `[2.3]`: un mock
  debe devolver la misma forma y tirar los mismos errores que la implementación real, o los tests
  pasan en verde y producción rompe.

## Errores — ALTO

- **Nada de fire-and-forget sin `.catch()`** `[3.1]`. `this.mailer.send(...)` sin await ni catch tumba
  el proceso con una unhandled rejection. Aplica especialmente a los listeners `@OnEvent` y a los
  `@Cron`: envolvé en try/catch y logueá, no relances.
- **Los handlers de eventos no propagan errores** `[3.1]`. Si falla, log + dead letter. Relanzar
  desde un `@OnEvent` crashea el proceso.
- **Exception filters, no formateo manual de errores en controllers** `[3.3]`. Filtro global para lo
  no manejado + filtros por tipo de excepción de dominio.
- Mapear errores de Prisma en un filtro: `P2002` → `ConflictException`, `P2025` → `NotFoundException`.
  No dejar que escape un `PrismaClientKnownRequestError` crudo al cliente.

## Seguridad — ALTO

- **Guards, no chequeos manuales de auth en cada handler** `[4.4]`. Ya existen `AuthGuard`/`AdminGuard`:
  usalos con decoradores, no repliques `if (!req.user)`.
- **Rate limiting con `@nestjs/throttler`** `[4.2]`, con límites distintos por endpoint. Crítico en
  login, recuperación de contraseña y **checkout/webhook de pagos**.
- **JWT: payload mínimo y vida corta** `[4.1]`. Nunca password, ni datos sensibles, ni flags de
  permiso que no se revaliden. Access token corto + refresh token hasheado en base.
- **`ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`** `[4.5]`. Sin
  whitelist, un campo de más en el body llega al service.
- **Sanitizar todo contenido de usuario que se persista** `[4.3]` (reseñas, nombres, notas de orden).
- Nunca reflejar input crudo del usuario en mensajes de error.

## Datos con Prisma — ALTO

- **N+1** `[7.1]`: nunca consultar dentro de un `for`. Un `include`/`select` anidado resuelve en una
  query. Activá logs de query en dev para detectarlos.
- **Traer solo lo que se usa** `[5.3]`. `select` explícito siempre; `include` de relaciones solo si
  se consumen. Paginar toda lista que pueda crecer.
- **Índices** `[5.3]` en columnas que se filtran u ordenan seguido, y compuestos para los patrones
  reales de query. Se declaran con `@@index` en el schema.
- **Migraciones, nunca `db push` fuera de dev** `[7.2]`. `prisma migrate dev` en local,
  `prisma migrate deploy` en Railway. Renombrar columna = migración en pasos (agregar → copiar →
  constraint → borrar), nunca de una.
- **`$transaction` cuando varias escrituras deben pasar juntas o ninguna** `[7.3]`. Checkout, reserva
  de stock y creación de orden van sí o sí en una transacción con locks.

## Respuestas y capas HTTP — MEDIO

- **Nunca devolver el objeto de Prisma tal cual** `[8.1]`. Prisma devuelve objetos planos: los
  decoradores `@Exclude()` de class-transformer **no aplican**. La única defensa real es `select`
  explícito o un DTO de respuesta. Un `findUnique` sin `select` filtra hashes y campos internos.
- **Interceptors para lo transversal** `[8.2]`: logging, timing, timeout, envelope de respuesta. No
  repetir esa lógica en cada handler.
- **Pipes para transformar entrada** `[8.3]`: `ParseUUIDPipe`, `ParseIntPipe`, `DefaultValuePipe`.
  Nada de `parseInt(query.page)` a mano en el controller.
- **Versionar antes de romper el contrato** `[8.4]`. El storefront y el backoffice son clientes
  reales: un cambio de forma sin versión los rompe en producción.

## Performance — ALTO

- **Los lifecycle hooks async se `await`ean** `[5.1]`. Un `onModuleInit()` que dispara una promesa sin
  retornarla hace que la app arranque antes de estar lista. Constructores livianos: la carga pesada
  va en `onModuleInit`.
- **Cachear con criterio** `[5.4]`: queries caras y repetidas (catálogo, home) con TTL corto e
  invalidación por evento. No cachear lo que cambia por request ni datos por usuario sin scopear la key.

## Testing — MEDIO-ALTO

- **`Test.createTestingModule` con dependencias mockeadas** `[6.3]`. Nunca instanciar un service con
  `new` en un test, ni pegarle a la base real.
- **Mockear todo lo externo** `[6.2]`: Mercado Pago, Cloudinary, MiCorreo, mailer. Cubrir también
  timeout, 429 y respuesta con error — no solo el happy path.
- **E2E con Supertest** `[6.1]` aplicando la **misma** config global que producción (pipes, filtros,
  interceptors), o los tests validan una app que no existe.
- Correr `bun run test` del área tocada antes de dar algo por terminado.

## Deploy en Railway — MEDIO

- **`app.enableShutdownHooks()` y cierre ordenado** `[10.1]`. Sin esto, cada deploy corta requests en
  vuelo y conexiones de Prisma a la mitad. Implementar `OnApplicationShutdown` donde haya recursos
  abiertos.
- **`ConfigModule` con validación de schema al arranque** `[10.2]`. Que falte `MP_WEBHOOK_SECRET`
  tiene que romper el boot, no fallar en el primer pago. Nada de `process.env.X` suelto en services.
- **Logging estructurado con contexto** `[10.3]`: `Logger` de Nest con contexto de clase, request id
  correlacionado, y redacción de `authorization`, passwords y tokens de MP. Nada de `console.log`.

## No aplica hoy

Sección 9 de la referencia (microservicios, `@MessagePattern`/`@EventPattern`, colas BullMQ):
el stack es un monolito REST. Consultarla solo si se agrega un worker o un broker.
