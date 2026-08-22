# Design System — YerbaXanaes v2

Paleta de origen (TikTok / UI contrast): Palm, Leaf, Shadow, Terra Cotta, Cream.
Marca: yerba agroecológica de Villa del Rosario, Córdoba. No inventamos datos de marca.

## El problema

Hoy hay **tres sistemas**, no uno:

1. **Tienda** (`apps/ecommerce/app/globals.css`): escala `yerba-*` verde (#4a7c3d) + `earth-*` tostado, Inter + Playfair. Dark mode es el default de shadcn (primario casi blanco, charts violeta).
2. **Backoffice** (`apps/backoffice/app/globals.css`): *otra* escala `yerba-*` / `earth-*` (hex distintos). Geist + `bg-stone-50`. Sin dark de marca.
3. **Toasts** (`components/providers.tsx` en ambos): `#fff` + borde `#e5e7eb`. Gris Tailwind, no yerba.

El logo circular (mate, greca, “YERBA XANA”) vive en un campo naranja. Esa naranja no está en los tokens CSS. La UI no se parece al sello.

## Por qué esta paleta

No es un verde stock de “eco SaaS”. Es hoja, sombra de monte y greda.

| Token | Hex | Rol | Contraste clave |
|---|---|---|---|
| **Shadow** | `#212C1B` | Texto, tinta del logo, chrome | 11.5:1 sobre Cream (AAA) |
| **Palm** | `#657F38` | Primario, botón, success | Blanco 4.52:1 (AA). Sobre Cream solo títulos |
| **Leaf** | `#9EAB57` | Ilustración, charts, info suave | Sobre Cream **falla**. Sobre Shadow 5.84:1 (AA) |
| **Terra Cotta** | `#D57640` | CTA caliente, warning, sale | Sobre Cream **2.55:1 FAIL**. No usarla como texto |
| **Cream** | `#FCE0C0` | Lienzo, campo del logo | Reemplaza el naranja radial y el blanco #fff |

Regla: **texto siempre Shadow o blanco**. Terra y Leaf son color de superficie o de trazo, no de párrafo.

## Logo (solo color)

No redibujamos el mate. Recoloreamos el sello:

- Campo: Cream (sale el radial naranja)
- Greca, bombilla, letras: Shadow
- Hojas: Palm + Leaf
- Un toque Terra en el aro interno o en un detalle, no en el fondo entero

## Tipografía

- **Tienda:** Playfair Display (ya está, encaja con el serif del sello) + **Source Sans 3** (sale Inter, que es el default genérico).
- **Backoffice:** Source Sans 3 + IBM Plex Mono para SKU/ids. Sale Geist (default Vercel).

Misma familia sans en los dos fronts. El admin no tiene que parecer otra empresa.

## Iconos

Ya está **lucide-react** (stroke consistente). El backoffice también importa **react-icons**: dos lenguajes visuales.

Decisión: Lucide único, `strokeWidth={1.75}`, tamaños 16/20/24. El mate del logo **no** se usa como icono de menú. No sumamos Phosphor ni Heroicons: más librerías no mejoran UX, mezclan trazos.

## Notificaciones

Sonner ya está. Falta el sistema:

| Tipo | Superficie | Texto | Uso |
|---|---|---|---|
| success | Palm | Blanco | Pedido, guardado, stock OK |
| error | `#A33B2B` | Blanco | Pago fallido, validación |
| warning | Cream + borde Terra | Shadow | Stock bajo, retiro pendiente |
| info | Shadow | Cream | Envío, WhatsApp |

- Tienda: `bottom-center` en mobile, `bottom-right` en desktop. Undo en “agregar al carrito”.
- Backoffice: `top-right`. `toast.promise` en guardar producto, importar Correo, marcar PAID.
- `prefers-reduced-motion`.
- Nunca Cream sobre Terra.

## Auditoría (estado actual)

| Dimensión | Score | Evidencia | Fix |
|---|---|---|---|
| Color | 3/10 | Dos escalas yerba distintas + toasts `#e5e7eb` | Un archivo de tokens compartido |
| Tipo | 5/10 | Inter/Playfair vs Geist | Source Sans 3 en ambos |
| Spacing | 6/10 | radius 0.625rem, scale 4px informal | Scale 4–64 documentada |
| Componentes | 5/10 | shadcn copiado por app, theme no compartido | Tokens en `packages/ui` |
| Responsive | 6/10 | Store móvil usable; admin no auditado en phone | Touch 44px en BO |
| Dark mode | 2/10 | `.dark` shadcn violeta; BO sin dark | Dark = Shadow canvas, Cream text. O no dark en v2 |
| Motion | 6/10 | `motion` presente, toasts sin ritmo de marca | 120/200ms |
| A11y | 4/10 | Terra/Leaf no sirven de texto; focus ring yerba-400 | Ring Palm, texto Shadow |
| Densidad | 6/10 | Home con copy genérico + cards | Menos “por qué elegirnos”, más producto |
| Polish | 4/10 | Toasts grises, iconos mixtos, logo naranja vs UI verde | Recolor + sonner themed |

**AI slop:** Inter, Geist, charts oklch violeta en `.dark`, toasts blancos, dos paletas “earth” inventadas en paralelo, hero con claims genéricos.

## Competidores (qué copiar / no)

Las marcas grandes de yerba (Playadito, CBSé, Canarias) venden pack shot + rojo/verde de paquete. YerbaXanaes no es un paquete de supermercado: es agroecológica y de pueblo. Cream + Shadow es más sello de almacén que landing SaaS. No copiar el hero centrado sobre stock.

## Qué se aplica

1. Recolor de `public/brand/logo.png` (y favicon/og si hereda naranja).
2. `globals.css` de tienda y backoffice leen la misma semántica (idealmente `packages/ui/tokens.css`).
3. Toaster Sonner con variantes de arriba.
4. Quitar `react-icons` del backoffice.
5. Source Sans 3. Playfair se queda en tienda.

Dark mode de marca (canvas Shadow) queda **fuera** de este corte: el store actual no lo usa de verdad y un dark a medias empeora más que ayuda.
