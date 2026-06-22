# MiCorreo API — Documentación de Referencia

> **Fuente:** doc oficial de Correo Argentino (`Correo Argentino - API MiCorreo.md`, fechada 2025-01-14).
> **Propósito:** referencia local para implementar/mantener la integración con MiCorreo en `apps/api/src/shipping/`.
> **Pareja:** `MERCADOPAGO_INTEGRATION.md` cumple este rol para Mercado Pago.

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [URLs base por ambiente](#2-urls-base-por-ambiente)
3. [Autenticación (Bearer JWT)](#3-autenticación-bearer-jwt)
4. [Códigos de error HTTP](#4-códigos-de-error-http)
5. [Endpoints](#5-endpoints)
   - 5.1. [`POST /token`](#51-post-token--obtener-jwt)
   - 5.2. [`POST /register`](#52-post-register--alta-de-usuario)
   - 5.3. [`POST /users/validate`](#53-post-usersvalidate--obtener-customerid)
   - 5.4. [`GET /agencies`](#54-get-agencies--sucursales-por-provincia)
   - 5.5. [`POST /rates`](#55-post-rates--cotizar-envío)
   - 5.6. [`POST /shipping/import`](#56-post-shippingimport--importar-envío)
   - 5.7. [`GET /shipping/tracking`](#57-get-shippingtracking--seguimiento)
6. [Códigos de provincia (provinceCode)](#6-códigos-de-provincia-provincecode)
7. [Mensajes de error conocidos de `/shipping/import`](#7-mensajes-de-error-conocidos-de-shippingimport)
8. [Resumen de capacidades](#8-resumen-de-capacidades)
9. [Notas para implementación en YerbaXanaes](#9-notas-para-implementación-en-yerbaxanaes)

---

## 1. Visión general

MiCorreo es la plataforma de Correo Argentino para gestión de envíos. Su API REST permite:

- **Cotizar** envíos a domicilio o sucursal a partir de CP, peso y dimensiones.
- **Importar** envíos (crear la "oblea" — etiqueta de envío — sin tener que cargar datos manualmente en el portal web).
- **Trackear** envíos importados.
- **Consultar** sucursales disponibles por provincia.
- **Registrar / validar usuarios** de la plataforma MiCorreo (solo para flujos de auto-onboarding).

Características técnicas:
- **REST** con verbos HTTP estándar.
- Acepta requests `form-encoded`, devuelve `JSON`.
- **HTTPS obligatorio** en ambientes exteriorizados.
- **JWT Bearer Auth** con tokens de corta vida (~hora y media).

---

## 2. URLs base por ambiente

| Ambiente | Local (intranet Correo) | Exteriorizada (público) |
|---|---|---|
| DEV | `http://app-correoargintercotizador-dev.apps.ocpbarr.correo.local` | — |
| QA / TEST | `http://app-correoargintercotizador-test.apps.ocpbarr.correo.local` | `https://apitest.correoargentino.com.ar/micorreo/v1` |
| PROD | `http://app-correoargintercotizador.apps.ocpprod.correo.local` | `https://api.correoargentino.com.ar/micorreo/v1` |

**Para YerbaXanaes solo importan las URLs exteriorizadas** (TEST y PROD).
Constante en código: `MICORREO_BASE_URLS` en [`apps/api/src/shipping/shipping.service.ts`](apps/api/src/shipping/shipping.service.ts).

---

## 3. Autenticación (Bearer JWT)

Flujo de dos pasos:

### Paso 1 — Obtener JWT con HTTP Basic Auth

```bash
curl -X POST ${BASE_URL}/token -u ${user}:${password}
```

**Credenciales:** las provee Correo Argentino vía [formulario de contacto](https://www.correoargentino.com.ar/MiCorreo/public/contact). Son **diferentes por ambiente** (TEST vs PROD).

**Response 200:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires": "2022-04-26 21:16:20"
}
```

> ⚠️ El campo `expires` viene como string sin timezone. Asumir UTC o consultar a Correo qué zona usan. En YerbaXanaes: parseamos con `' '` → `'T'`. **Considerar agregar `'Z'` si Correo confirma UTC.**

**Response 401:**
```json
{ "code": "401", "message": "Unauthorized" }
```

### Paso 2 — Usar el JWT en cada request

```bash
curl -X POST ${BASE_URL}/endpoint \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H 'Content-Type: application/json' \
  -d '{...}'
```

**Reglas:**
- HTTPS obligatorio (HTTP simple → request falla).
- Sin Bearer → 401.
- Las claves API son sensibles: **nunca commitear en el repo**, **nunca exponer al cliente**.

En YerbaXanaes: helper `getMiCorreoToken()` con cache JWT por expiry y `miCorreoFetch()` genérico para auth en todos los endpoints.

---

## 4. Códigos de error HTTP

| Código | Significado |
|---|---|
| 200 | OK — todo funcionó. |
| 400 | Bad Request — falta un parámetro obligatorio. |
| 401 | Unauthorized — token inválido o ausente. |
| 402 | **Request Failed** — params válidos pero el endpoint rechazó la operación (Correo usa 402 donde otros usarían 422). |
| 403 | Forbidden — token sin permisos suficientes. |
| 404 | Not Found — recurso inexistente. |
| 409 | Conflict — colisión por idempotencia. |
| 429 | Too Many Requests — usar backoff exponencial. |
| 50x | Error del lado de Correo (raros). |

**Forma del response error:**
```json
{ "code": "404", "message": "Resource not found" }
```

---

## 5. Endpoints

### 5.1. `POST /token` — Obtener JWT

Cubierto en [sección 3](#3-autenticación-bearer-jwt).

---

### 5.2. `POST /register` — Alta de usuario

Registra un nuevo usuario en MiCorreo. **No lo usamos en YerbaXanaes** — la clienta ya tiene cuenta. Documentado por completitud.

**Tipos de alta:**
- `DNI` — consumidor final.
- `CUIT` — monotributista / responsable inscripto.

**Body attributes:**

| Campo | Descripción | Requerido |
|---|---|---|
| `firstName` | Nombre | ✔ |
| `lastName` | Apellido | (✔ con DNI) |
| `email` | Email único en MiCorreo. **No se valida el formato ni se envía mail de confirmación.** | ✔ |
| `password` | Contraseña | ✔ |
| `documentType` | `"DNI"` o `"CUIT"` | ✔ |
| `documentId` | Número de DNI o CUIT | ✔ |
| `phone` | Tel fijo | — |
| `cellPhone` | Celular | — |
| `address.streetName` | Calle | (✔ con DNI) |
| `address.streetNumber` | Altura | (✔ con DNI) |
| `address.floor` | Piso | — |
| `address.apartment` | Departamento | — |
| `address.city` | Ciudad | (✔ con DNI) |
| `address.provinceCode` | Provincia (ver [§6](#6-códigos-de-provincia-provincecode)) | (✔ con DNI) |
| `address.postalCode` | CP | (✔ con DNI) |

**Response 200:**
```json
{ "customerId": "0090000024", "createdAt": "2022-04-28 12:08:16.847" }
```

**Errores 402 conocidos:** `"Email existente..."`, `"Error..."`.

---

### 5.3. `POST /users/validate` — Obtener customerId

Devuelve el `customerId` de un usuario ya registrado. Útil si tenés email+password pero no guardaste el `customerId`.

**Body:**
```json
{ "email": "email2@mail.com", "password": "secret" }
```

**Response 200:**
```json
{ "customerId": "0090000025", "createdAt": "2021-03-10" }
```

**Response 404:**
```json
{ "code": "404", "message": "Usuario no valido o inexistente" }
```

> 💡 En YerbaXanaes el `customerId` debe guardarse en `CA_CUSTOMER_ID` del `.env` para evitar este round-trip al startup.

---

### 5.4. `GET /agencies` — Sucursales por provincia

Devuelve las sucursales activas de una provincia, con horarios, servicios y geolocalización.

**Query params:**

| Campo | Descripción | Requerido |
|---|---|---|
| `customerId` | Identificador del usuario MiCorreo | ✔ |
| `provinceCode` | Código de provincia (ver [§6](#6-códigos-de-provincia-provincecode)) | ✔ |
| `services` | Filtro opcional: `"package_reception"` o `"pickup_availability"` | — |

**Request:**
```bash
curl -H "Authorization: Bearer ..." \
  ${BASE_URL}/agencies \
  --data-urlencode "customerId=0090000025" \
  --data-urlencode "provinceCode=B"
```

**Response 200** (array de agencias):
```json
[
  {
    "code": "B0107",
    "name": "Monte Grande",
    "manager": "Denardo, Matías Gabriel",
    "email": "sopoficina@correoargentino.com.ar",
    "phone": "(03401) 448396",
    "services": { "packageReception": true, "pickupAvailability": true },
    "location": {
      "address": {
        "streetName": "Vicente Lopez",
        "streetNumber": "448",
        "floor": null,
        "apartment": null,
        "locality": "Monte Grande",
        "city": "Esteban Echeverria",
        "province": "Buenos Aires",
        "provinceCode": "B",
        "postalCode": "B1842ZAB"
      },
      "latitude": "-34.81939997",
      "longitude": "-58.46747615"
    },
    "hours": {
      "sunday": null,
      "monday": { "start": "0930", "end": "1800" },
      "tuesday": { "start": "1000", "end": "1800" },
      "wednesday": { "start": "1000", "end": "1800" },
      "thursday": { "start": "1000", "end": "1800" },
      "friday": { "start": "1000", "end": "1800" },
      "saturday": null,
      "holidays": null
    },
    "status": "ACTIVE"
  }
]
```

**Response 402:**
```json
{ "code": "402", "message": "Customer ID no valido" }
```

**Uso en YerbaXanaes:** futuro feature de "envío a sucursal" — listar sucursales cercanas al cliente.

---

### 5.5. `POST /rates` — Cotizar envío

Calcula el precio de un envío a domicilio (`D`), a sucursal (`S`), o ambos.

**Body attributes:**

| Campo | Descripción | Requerido |
|---|---|---|
| `customerId` | Identificador MiCorreo | ✔ |
| `postalCodeOrigin` | CP origen | ✔ |
| `postalCodeDestination` | CP destino | ✔ |
| `deliveredType` | `"D"` (domicilio), `"S"` (sucursal). **Omitir para obtener las dos cotizaciones.** | — |
| `dimensions.weight` | Peso en gramos (mín 1, máx 25000) | ✔ |
| `dimensions.height` | Alto en cm (máx 150) | ✔ |
| `dimensions.width` | Ancho en cm (máx 150) | ✔ |
| `dimensions.length` | Largo en cm (máx 150) | ✔ |

> **Importante:** todos los campos de `dimensions` son **integers** (sin decimales).

**Request — envío a domicilio:**
```json
{
  "customerId": "0000550137",
  "postalCodeOrigin": "1757",
  "postalCodeDestination": "1704",
  "deliveredType": "D",
  "dimensions": { "weight": 2500, "height": 10, "width": 20, "length": 30 }
}
```

**Response 200:**
```json
{
  "customerId": "0000550997",
  "validTo": "2022-06-07T10:31:27.881-03:00",
  "rates": [
    {
      "deliveredType": "D",
      "productType": "CP",
      "productName": "Correo Argentino Clasico",
      "price": 498.06,
      "deliveryTimeMin": "2",
      "deliveryTimeMax": "5"
    }
  ]
}
```

**Variante — omitir `deliveredType` para obtener D + S en una sola llamada:**
```json
{
  "customerId": "0000550997",
  "postalCodeOrigin": "1757",
  "postalCodeDestination": "1704",
  "dimensions": { "weight": 2500, "height": 10, "width": 20, "length": 30 }
}
```
→ Devuelve dos elementos en `rates`, uno por cada tipo (D y S).

**Response 402:**
```json
{ "code": "402", "message": "Cliente FAP no identificado {customerId}" }
```

**`productType` conocidos:**
- `"CP"` — Paquete (default).
- `"EP"` — Encomienda (uso interno).

**`validTo`:** la cotización tiene tiempo de expiración. Si pasó, hay que re-cotizar.

**Uso en YerbaXanaes:** se llama en el **delivery-step del checkout** y se **re-cotiza server-side** en `processBrickPayment` cuando se reusa una orden brick-init (protección anti-manipulación). Si el costo real difiere > $0.50 del enviado por el cliente, se cancela la orden y se pide re-cotización.

---

### 5.6. `POST /shipping/import` — Importar envío

Crea una "doblea" (etiqueta) en MiCorreo. Equivale a cargar manualmente los datos del envío en el portal web de Correo. Después de este POST, la hermana de Mateo solo tiene que **imprimir la etiqueta** desde el dashboard y llevar el paquete a la sucursal.

#### Estructura del body

**Top level:**

| Campo | Descripción | Requerido |
|---|---|---|
| `customerId` | Identificador MiCorreo | ✔ |
| `extOrderId` | ID externo de la orden (nuestro `order.id`) | ✔ |
| `orderNumber` | Identificador externo visible en MiCorreo (puede ser corto/legible) | — |
| `sender` | Datos del remitente — ver tabla abajo | — |
| `recipient` | Datos del destinatario | ✔ |
| `shipping` | Datos del envío | ✔ |

#### `sender` (Remitente — opcional)

Si **todos los campos** se envían en `null`, MiCorreo usa la dirección registrada del `customerId`. Si necesitás overridear para un envío específico, completalos.

| Campo | Descripción |
|---|---|
| `sender.name` | Nombre del remitente |
| `sender.phone` | Tel fijo |
| `sender.cellPhone` | Celular |
| `sender.email` | Email |
| `sender.originAddress.streetName` | Calle |
| `sender.originAddress.streetNumber` | Altura |
| `sender.originAddress.floor` | Piso |
| `sender.originAddress.apartment` | Depto |
| `sender.originAddress.city` | Ciudad |
| `sender.originAddress.provinceCode` | Provincia (ver [§6](#6-códigos-de-provincia-provincecode)) |
| `sender.originAddress.postalCode` | CP |

> ⚠️ **Si el perfil del `customerId` en MiCorreo está incompleto**, todos los `null` causan errores como `"no se encontro datos de remitente"`, `"El codigo Postal del emisor debe tener valor"`, `"La provincia del emisor debe tener valor"`. En YerbaXanaes: variables de entorno `CA_SENDER_*` permiten overridear si hace falta.

#### `recipient` (Destinatario)

| Campo | Descripción | Requerido |
|---|---|---|
| `recipient.name` | Nombre completo del destinatario | ✔ |
| `recipient.phone` | Tel fijo | — |
| `recipient.cellPhone` | Celular | — |
| `recipient.email` | Email | ✔ |

#### `shipping` (Datos del envío)

| Campo | Descripción | Requerido |
|---|---|---|
| `shipping.deliveryType` | `"D"` (domicilio) o `"S"` (sucursal) | ✔ |
| `shipping.productType` | Default: `"CP"` (paquete) | ✔ |
| `shipping.agency` | Código de sucursal — **solo cuando `deliveryType === "S"`** | (✔ si S) |
| `shipping.address.streetName` | Calle del destino | (✔ si D) |
| `shipping.address.streetNumber` | Altura | (✔ si D) |
| `shipping.address.floor` | Piso (trunca a 3 chars) | — |
| `shipping.address.apartment` | Depto (trunca a 3 chars) | — |
| `shipping.address.city` | Ciudad | (✔ si D) |
| `shipping.address.provinceCode` | Provincia | (✔ si D) |
| `shipping.address.postalCode` | CP | (✔ si D) |
| `shipping.weight` | Peso en gramos | ✔ |
| `shipping.declaredValue` | Valor declarado (ARS) | ✔ |
| `shipping.height` | Alto en cm (rango 0–255) | ✔ |
| `shipping.length` | Largo en cm (rango 0–255) | ✔ |
| `shipping.width` | Ancho en cm (rango 0–255) | ✔ |

> Los campos `weight`, `height`, `length`, `width` son **integers**.

#### Request — Envío a domicilio

```json
{
  "customerId": "0005000033",
  "extOrderId": "583358193",
  "orderNumber": "102",
  "sender": {
    "name": null, "phone": null, "cellPhone": null, "email": null,
    "originAddress": {
      "streetName": null, "streetNumber": null, "floor": null,
      "apartment": null, "city": null, "provinceCode": null, "postalCode": null
    }
  },
  "recipient": {
    "name": "Aa cc",
    "phone": "", "cellPhone": "",
    "email": "username@mail.com"
  },
  "shipping": {
    "deliveryType": "D",
    "agency": null,
    "address": {
      "streetName": "Bb", "streetNumber": "1234",
      "floor": "", "apartment": "",
      "city": "Buenos Aires", "provinceCode": "B", "postalCode": "1425"
    },
    "productType": "CP",
    "weight": 1000,
    "declaredValue": 500.00,
    "height": 20, "length": 40, "width": 20
  }
}
```

#### Request — Envío a sucursal

Diferencias respecto a domicilio:
- `shipping.deliveryType: "S"`
- `shipping.agency: "E0000"` (código de sucursal obligatorio, obtenido vía `GET /agencies`)
- La dirección puede ir igual o vacía (el destino real es la sucursal).

#### Response 200 (éxito)

```json
{ "createdAt": "2022-06-07T16:15:04.996-03:00" }
```

> ⚠️ **CRÍTICO:** el response **NO devuelve un `trackingNumber`**. Solo confirma la creación con la fecha. El número de seguimiento real se asigna después y queda visible en el dashboard de MiCorreo. Para tener tracking → hay que cargarlo manualmente (flujo implementado en YerbaXanaes vía `POST /shipping/orders/:orderId/tracking-number`).

#### Response 402 (error)

```json
{ "code": "402", "message": "Error ..." }
```

Mensajes posibles → ver [§7](#7-mensajes-de-error-conocidos-de-shippingimport).

---

### 5.7. `GET /shipping/tracking` — Seguimiento

Devuelve los eventos de seguimiento de un envío importado.

> ⚠️ La doc oficial es ambigua: lista `shippingId` como "Body Attributes" pero el curl muestra `-X GET ... -d '{"shippingId":"..."}'` (GET con body, no estándar). En YerbaXanaes usamos **query string** (`?shippingId=...`) que también funciona.

**Request:**
```bash
curl -X GET "${BASE_URL}/shipping/tracking?shippingId=000500076393019A3G0C701" \
  -H "Authorization: Bearer ..." \
  -H 'Content-Type: application/json'
```

**`shippingId`:** el **tracking number real** asignado por Correo Argentino, formato típico de 25 chars: `"000500076393019A3G0C701"`. **No es nuestro `extOrderId`.**

#### Response 200 — Con eventos (array)

```json
[
  {
    "id": "000017496",
    "productId": "HC",
    "trackingNumber": "000500076393019A3G0C701",
    "events": [
      {
        "event": "CADUCA",
        "date": "09-12-2024 05:00",
        "branch": "CORREO ARGENTINO",
        "status": "",
        "sign": ""
      },
      {
        "event": "PREIMPOSICION",
        "date": "28-08-2024 10:33",
        "branch": "CORREO ARGENTINO",
        "status": "",
        "sign": ""
      }
    ]
  }
]
```

#### Response 200 — Sin eventos todavía (object)

```json
{
  "id": null,
  "productId": null,
  "trackingNumber": "000500076393019A3G0C701K",
  "events": []
}
```

#### Response 200 — Error encapsulado (object con `error`)

```json
{
  "date": "2025-01-13T14:56:09.832-03:00",
  "error": "No existe el cliente o pedido",
  "code": "0"
}
```

> ⚠️ Notar que **devuelve HTTP 200 incluso en errores lógicos** — hay que parsear el body para detectar `error`/`code`. La respuesta puede ser **array** o **objeto** según el estado.

**Eventos conocidos** (no exhaustivo):
- `PREIMPOSICION` — se creó la doblea, falta llevar el paquete a la sucursal.
- `IMPOSICION` — el paquete fue depositado en la sucursal.
- `EN_TRANSITO` — en camino.
- `EN_DISTRIBUCION` — en el centro de distribución del destino.
- `ENTREGADO` — entregado al destinatario.
- `CADUCA` — pasó cierto tiempo sin movimiento.
- `DEVOLUCION` — se devuelve al remitente.

---

## 6. Códigos de provincia (provinceCode)

| Code | Provincia |
|---|---|
| A | Salta |
| B | Provincia de Buenos Aires |
| C | Ciudad Autónoma de Buenos Aires (Capital Federal) |
| D | San Luis |
| E | Entre Ríos |
| F | La Rioja |
| G | Santiago del Estero |
| H | Chaco |
| J | San Juan |
| K | Catamarca |
| L | La Pampa |
| M | Mendoza |
| N | Misiones |
| P | Formosa |
| Q | Neuquén |
| R | Río Negro |
| S | Santa Fe |
| T | Tucumán |
| U | Chubut |
| V | Tierra del Fuego |
| W | Corrientes |
| **X** | **Córdoba** ← YerbaXanaes origen (Villa del Rosario) |
| Y | Jujuy |
| Z | Santa Cruz |

---

## 7. Mensajes de error conocidos de `/shipping/import`

Lista textual de errores que devuelve WCP (el backend de Correo). Útiles para mapear a mensajes accionables en la UI.

| Mensaje (regex sugerida) | Causa | Cómo arreglar |
|---|---|---|
| `"La orden ya fue importada con anterioridad"` | Duplicado de `extOrderId` | No reintentar; tomar el `correoImportedAt` que ya está guardado |
| `"Peso no valido"` / `"El peso debe ser mayor a 0"` | `shipping.weight` ≤ 0 o NaN | Revisar `calculatePackageWeight()` |
| `"El peso excede el maximo permitido para el producto"` | > 25000g | Dividir en múltiples envíos |
| `"Tipo de entrega invalido"` | `deliveryType` distinto de `"D"`/`"S"` | Validar enum |
| `"Verifique la sucursal de destino"` | `agency` inválido o ausente cuando `deliveryType="S"` | Pedir agency desde `/agencies` |
| `"Tipo de encomienda [TENC] no valida"` | `productType` distinto de `"CP"`/`"EP"` | Forzar `"CP"` |
| `"no se encontro datos de remitente - id :..."` | Perfil del customerId incompleto y sender en null | Configurar `CA_SENDER_*` en `.env` |
| `"El codigo Postal del emisor debe tener valor"` | Idem anterior | Configurar `CA_SENDER_POSTAL_CODE` |
| `"La provincia del emisor debe tener valor"` | Idem | Configurar `CA_SENDER_PROVINCE_CODE` |
| `"La provincia es invalida"` | provinceCode no es una letra válida | Verificar tabla [§6](#6-códigos-de-provincia-provincecode) |
| `"El alto debe estar entre 0 y 255"` | `shipping.height` fuera de rango | Revisar `DEFAULT_DIMENSIONS` |
| `"El ancho debe estar entre 0 y 255"` | `shipping.width` fuera de rango | Idem |
| `"El largo debe estar entre 0 y 255"` | `shipping.length` fuera de rango | Idem |

---

## 8. Resumen de capacidades

| Operación | Endpoint | Cuándo usarla en YerbaXanaes |
|---|---|---|
| Cotizar envío | `POST /rates` | Delivery step + re-cotización al pagar |
| Listar sucursales | `GET /agencies` | Futuro: cuando habiliten "envío a sucursal" |
| Importar envío (crear doblea) | `POST /shipping/import` | Backoffice → botón "Importar a Correo Argentino" |
| Trackear envío | `GET /shipping/tracking` | Backoffice tracking + futuro: link al cliente |
| Onboarding usuario | `POST /register`, `POST /users/validate` | No usar (la clienta ya tiene cuenta) |
| Auth | `POST /token` | Cache JWT con expiry — interno del helper `getMiCorreoToken()` |

**Lo que la API NO ofrece** (y por eso requerimos flujos manuales):
- ❌ No devuelve el `trackingNumber` al importar → hay que copiarlo manualmente desde el dashboard.
- ❌ No tiene webhook ni callback de eventos de tracking → polling es la única opción.
- ❌ No tiene endpoint para cancelar/modificar un envío importado.
- ❌ No tiene endpoint de bulk import.
- ❌ No tiene endpoint para descargar el PDF de la etiqueta vía API → hay que ir al dashboard.

---

## 9. Notas para implementación en YerbaXanaes

### Variables de entorno (`apps/api/.env`)

```bash
# Credenciales API (pedir a Correo Argentino)
CA_USER_TOKEN=
CA_PASSWORD_TOKEN=

# Credenciales de cuenta MiCorreo (para login)
CA_EMAIL=
CA_PASSWORD=

# customerId (acelera startup, evita /users/validate)
CA_CUSTOMER_ID=

# Ambiente
CA_ENVIRONMENT=TEST           # TEST | PROD
CA_POSTAL_CODE_ORIGIN=5963    # Villa del Rosario, Córdoba

# Sender override (opcional — si vacío usa el perfil registrado)
CA_SENDER_NAME=
CA_SENDER_PHONE=
CA_SENDER_CELL_PHONE=
CA_SENDER_EMAIL=
CA_SENDER_STREET=
CA_SENDER_NUMBER=
CA_SENDER_FLOOR=
CA_SENDER_APARTMENT=
CA_SENDER_CITY=
CA_SENDER_PROVINCE_CODE=
CA_SENDER_POSTAL_CODE=
```

### Helpers internos

Ubicación: [`apps/api/src/shipping/shipping.service.ts`](apps/api/src/shipping/shipping.service.ts).

- `getMiCorreoToken()` — obtiene JWT vía `/token`, cachea hasta `expires - 60s`.
- `miCorreoFetch(path, options)` — wrapper de `fetch()` con Bearer y JSON.
- `buildSenderPayload()` — construye el objeto `sender` desde `CA_SENDER_*` (o todos `null`).
- `getRates(dto)` — cotiza envíos (`POST /rates`).
- `importShipping(orderId)` — crea doblea (`POST /shipping/import`). Devuelve `{ correoImportedAt, message }` — **no devuelve tracking number**.
- `setTrackingNumber(orderId, trackingNumber, correoShippingId?)` — endpoint admin para cargar manualmente el número de seguimiento copiado del dashboard.
- `getTracking(orderId)` — consulta `GET /shipping/tracking` con el `correoShippingId` real guardado.

### Flujo end-to-end

1. **Checkout (público):** cliente elige CP destino → frontend pega `POST /api/shipping/rates` → cotización mostrada.
2. **Brick payment:** al confirmar pago, server re-cotiza con `getRates()` y rechaza si el costo difiere > $0.50.
3. **Pago aprobado:** la orden queda en `PAID` con `shippingProvider="correo_argentino"`.
4. **Backoffice — "Importar a Correo":** admin hace click → `POST /shipping/import/:orderId` → backend invoca `importShipping()` → MiCorreo responde 200 con `createdAt` → orden queda con `correoImportedAt`.
5. **Admin imprime la doblea** desde el dashboard de MiCorreo.
6. **Backoffice — "Cargar tracking":** una vez que el dashboard muestra el tracking, admin pega el número en el input → `POST /shipping/orders/:orderId/tracking-number` → guarda `trackingNumber` + `correoShippingId`.
7. **Tracking (admin):** `GET /shipping/tracking/:orderId` → muestra los eventos.
8. **Tracking (cliente):** link público `https://www.correoargentino.com.ar/formularios/oas?id=${trackingNumber}` (solo funciona cuando hay un tracking real).

### Gotchas conocidos

- **Token expiry sin timezone:** `expires` viene como `"2022-04-26 21:16:20"` sin TZ. Si Vercel está en UTC y Correo manda hora local Argentina (UTC-3), el cache puede dar tokens vencidos por 3h. **Confirmar con Correo o asumir UTC.**
- **Tipos enteros estrictos:** weight/height/width/length deben ser `Number.isInteger()`. Cuidado con peso calculado en gramos que dé decimales.
- **`/shipping/tracking` devuelve 200 en errores lógicos:** parsear `data.error` y `data.code`, no confiar solo en HTTP status.
- **`/shipping/tracking` devuelve array O object:** chequear `Array.isArray(data)` antes de iterar.
- **No hay webhook:** si querés notificar al cliente cuando hay un nuevo evento de tracking, hay que hacer polling periódico.
- **La librería `ylazzari-correoargentino` v0.0.7** tiene `shipping/import` marcado como 🟨 pendiente. Por eso usamos HTTP directo. Considerar deprecar la librería y migrar `getRates()` también a HTTP directo (uniformidad).

### Links útiles

- [Doc oficial PDF](https://www.correoargentino.com.ar/MiCorreo/public/img/pag/apiMiCorreo.pdf)
- [Portal MiCorreo](https://www.correoargentino.com.ar/MiCorreo/public/)
- [Formulario para solicitar credenciales](https://www.correoargentino.com.ar/MiCorreo/public/contact)
- [Tracking público (frontend del cliente)](https://www.correoargentino.com.ar/formularios/oas?id={TRACKING})
