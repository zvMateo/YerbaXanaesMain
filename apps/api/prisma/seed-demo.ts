/**
 * Seed de DEMO — 10 productos con stock directo, listos para mostrar la tienda.
 *
 * - Idempotente: usa upsert por slug (categorías/productos) y por sku (variantes).
 *   Se puede correr N veces sin duplicar y NO borra nada (a diferencia de seed.ts).
 * - Datos ficticios: nombres, precios e imágenes son placeholders de demo.
 *   El catálogo real se carga desde el backoffice (ver docs/go-live.md).
 * - `weight` en gramos (incluye envase) para que cotice el envío con Correo Argentino.
 *
 * Uso (desde apps/api):  bun run seed:demo
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type DemoVariant = {
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
};

type DemoProduct = {
  name: string;
  slug: string;
  description: string;
  category: 'yerbas' | 'saborizadas' | 'mates' | 'accesorios';
  isFeatured?: boolean;
  color: string;
  variants: DemoVariant[];
};

const CATEGORIES = [
  { slug: 'yerbas', name: 'Yerbas' },
  { slug: 'saborizadas', name: 'Yerbas Saborizadas' },
  { slug: 'mates', name: 'Mates' },
  { slug: 'accesorios', name: 'Accesorios' },
] as const;

const PRODUCTS: DemoProduct[] = [
  {
    name: 'Yerba Mate Tradicional',
    slug: 'yerba-tradicional',
    description:
      'Yerba mate con palo, sabor equilibrado para el mate de todos los días.',
    category: 'yerbas',
    isFeatured: true,
    color: '2f855a',
    variants: [
      { name: '500g', sku: 'YER-TRAD-500', price: 4200, stock: 80, weight: 530 },
      { name: '1kg', sku: 'YER-TRAD-1K', price: 7800, stock: 50, weight: 1040 },
    ],
  },
  {
    name: 'Yerba Mate Suave Despalada',
    slug: 'yerba-despalada',
    description:
      'Sin palo, de sabor más suave y menos amargo. Ideal para quienes recién empiezan.',
    category: 'yerbas',
    isFeatured: true,
    color: '38a169',
    variants: [
      { name: '500g', sku: 'YER-DESP-500', price: 4600, stock: 60, weight: 530 },
      { name: '1kg', sku: 'YER-DESP-1K', price: 8500, stock: 35, weight: 1040 },
    ],
  },
  {
    name: 'Yerba Mate Orgánica',
    slug: 'yerba-organica',
    description:
      'Cultivo orgánico, sin agroquímicos. Sabor puro y natural.',
    category: 'yerbas',
    color: '276749',
    variants: [
      { name: '500g', sku: 'YER-ORG-500', price: 5800, stock: 40, weight: 530 },
    ],
  },
  {
    name: 'Yerba Mate Estacionada 24 Meses',
    slug: 'yerba-estacionada',
    description:
      'Estacionamiento natural extendido para un sabor más redondo y profundo.',
    category: 'yerbas',
    isFeatured: true,
    color: '22543d',
    variants: [
      { name: '1kg', sku: 'YER-EST-1K', price: 9500, stock: 30, weight: 1040 },
    ],
  },
  {
    name: 'Yerba Mate con Hierbas Serranas',
    slug: 'yerba-hierbas-serranas',
    description:
      'Blend con menta y peperina. Refrescante y digestiva.',
    category: 'saborizadas',
    color: '68d391',
    variants: [
      { name: '500g', sku: 'YER-SERR-500', price: 4800, stock: 45, weight: 530 },
    ],
  },
  {
    name: 'Yerba Mate con Naranja',
    slug: 'yerba-naranja',
    description:
      'Yerba con cáscara de naranja natural. Cítrica y refrescante.',
    category: 'saborizadas',
    color: 'dd6b20',
    variants: [
      { name: '500g', sku: 'YER-NAR-500', price: 4900, stock: 40, weight: 530 },
    ],
  },
  {
    name: 'Mate Camionero Cuero',
    slug: 'mate-camionero',
    description:
      'Mate camionero forrado en cuero con virola de acero inoxidable.',
    category: 'mates',
    isFeatured: true,
    color: '8c4b2f',
    variants: [
      { name: 'Marrón', sku: 'MAT-CAM-MAR', price: 24000, stock: 15, weight: 450 },
      { name: 'Negro', sku: 'MAT-CAM-NEG', price: 24000, stock: 12, weight: 450 },
    ],
  },
  {
    name: 'Mate de Calabaza Curado',
    slug: 'mate-calabaza',
    description:
      'Calabaza natural, ya curada y lista para usar.',
    category: 'mates',
    color: 'b7791f',
    variants: [
      { name: 'Único', sku: 'MAT-CAL-UNI', price: 12500, stock: 20, weight: 300 },
    ],
  },
  {
    name: 'Bombilla Pico de Loro',
    slug: 'bombilla-pico-loro',
    description:
      'Bombilla de acero inoxidable con filtro, no se tapa.',
    category: 'accesorios',
    color: 'a0aec0',
    variants: [
      { name: 'Acero', sku: 'ACC-BOM-ACE', price: 6500, stock: 60, weight: 80 },
    ],
  },
  {
    name: 'Set Matero Completo',
    slug: 'set-matero',
    description:
      'Mate, bombilla y yerba de 500g, listos para regalar.',
    category: 'accesorios',
    isFeatured: true,
    color: '553c9a',
    variants: [
      { name: 'Set', sku: 'SET-MAT-001', price: 34000, stock: 10, weight: 1100 },
    ],
  },
];

async function main() {
  console.log('🌱 Seed demo (10 productos)...');

  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug },
      select: { id: true },
    });
    categoryIds.set(c.slug, category.id);
  }

  for (const p of PRODUCTS) {
    const images = [
      `https://placehold.co/800x800/${p.color}/ffffff?text=${encodeURIComponent(p.name)}`,
    ];

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        isFeatured: p.isFeatured ?? false,
        isActive: true,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        isFeatured: p.isFeatured ?? false,
        isActive: true,
        images,
        categoryId: categoryIds.get(p.category)!,
      },
      select: { id: true },
    });

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { name: v.name, price: v.price, stock: v.stock, weight: v.weight },
        create: {
          productId: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          weight: v.weight,
        },
        select: { id: true },
      });
    }

    console.log(`  ✓ ${p.name} (${p.variants.length} variante/s)`);
  }

  console.log('🎉 Seed demo completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
