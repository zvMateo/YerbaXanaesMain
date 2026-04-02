import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Crear categorías
  const categoriaTradicional = await prisma.category.upsert({
    where: { slug: 'tradicional' },
    update: {},
    create: {
      name: 'Yerba Tradicional',
      slug: 'tradicional',
    },
  });

  const categoriaOrganica = await prisma.category.upsert({
    where: { slug: 'organica' },
    update: {},
    create: {
      name: 'Yerba Orgánica',
      slug: 'organica',
    },
  });

  const categoriaSaborizadas = await prisma.category.upsert({
    where: { slug: 'saborizadas' },
    update: {},
    create: {
      name: 'Yerbas Saborizadas',
      slug: 'saborizadas',
    },
  });

  console.log('✅ Categorías creadas');

  // 2. Crear productos con variantes

  // Producto 1: Yerba Mate Clásica
  const producto1 = await prisma.product.upsert({
    where: { slug: 'yerba-mate-clasica' },
    update: {},
    create: {
      name: 'Yerba Mate Clásica',
      slug: 'yerba-mate-clasica',
      description:
        'Yerba mate tradicional argentina con palo. Sabor equilibrado y suave, ideal para el mate de todos los días.',
      categoryId: categoriaTradicional.id,
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1551538827-9c037cb5a19d?w=800',
      ],
      variants: {
        create: [
          {
            name: '500g',
            price: 2500,
            stock: 100,
          },
          {
            name: '1kg',
            price: 4500,
            stock: 50,
          },
        ],
      },
    },
  });

  // Producto 2: Yerba Mate Orgánica
  const producto2 = await prisma.product.upsert({
    where: { slug: 'yerba-mate-organica' },
    update: {},
    create: {
      name: 'Yerba Mate Orgánica',
      slug: 'yerba-mate-organica',
      description:
        'Yerba mate 100% orgánica certificada. Sin agroquímicos ni pesticidas. Sabor puro y natural.',
      categoryId: categoriaOrganica.id,
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
      ],
      variants: {
        create: [
          {
            name: '500g',
            price: 3500,
            stock: 75,
          },
          {
            name: '1kg',
            price: 6500,
            stock: 40,
          },
        ],
      },
    },
  });

  // Producto 3: Yerba Mate con Hierbas
  const producto3 = await prisma.product.upsert({
    where: { slug: 'yerba-mate-hierbas' },
    update: {},
    create: {
      name: 'Yerba Mate con Hierbas Serranas',
      slug: 'yerba-mate-hierbas',
      description:
        'Blend de yerba mate con menta, peperina y marcela. Sabor refrescante y digestivo.',
      categoryId: categoriaSaborizadas.id,
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800',
      ],
      variants: {
        create: [
          {
            name: '500g',
            price: 3000,
            stock: 60,
          },
          {
            name: '1kg',
            price: 5500,
            stock: 30,
          },
        ],
      },
    },
  });

  // Producto 4: Yerba Mate Suave
  const producto4 = await prisma.product.upsert({
    where: { slug: 'yerba-mate-suave' },
    update: {},
    create: {
      name: 'Yerba Mate Suave Sin Palo',
      slug: 'yerba-mate-suave',
      description:
        'Yerba mate despalada, ideal para quienes prefieren un sabor más suave y menos amargo.',
      categoryId: categoriaTradicional.id,
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1596449080386-9762d0c76e7f?w=800',
      ],
      variants: {
        create: [
          {
            name: '500g',
            price: 2800,
            stock: 80,
          },
        ],
      },
    },
  });

  // Producto 5: Yerba Mate con Naranja
  const producto5 = await prisma.product.upsert({
    where: { slug: 'yerba-mate-naranja' },
    update: {},
    create: {
      name: 'Yerba Mate Saborizada Naranja',
      slug: 'yerba-mate-naranja',
      description:
        'Yerba mate con cáscara de naranja natural. Sabor cítrico y refrescante.',
      categoryId: categoriaSaborizadas.id,
      isActive: true,
      images: [
        'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=800',
      ],
      variants: {
        create: [
          {
            name: '500g',
            price: 3200,
            stock: 50,
          },
        ],
      },
    },
  });

  console.log('✅ Productos creados:');
  console.log(`  - ${producto1.name}`);
  console.log(`  - ${producto2.name}`);
  console.log(`  - ${producto3.name}`);
  console.log(`  - ${producto4.name}`);
  console.log(`  - ${producto5.name}`);

  console.log('\n🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
