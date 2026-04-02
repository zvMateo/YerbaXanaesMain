import {
  PrismaClient,
  OrderStatus,
  PaymentProvider,
  Role,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Limpiar base de datos
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.variantIngredient.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.inventoryItem.deleteMany();
  // No borramos usuarios ADMIN para no perder acceso, solo USERs de prueba
  await prisma.user.deleteMany({ where: { role: 'USER' } });

  console.log('🧹 Database cleaned');

  // 2. Crear Inventario (Insumos)
  const yerbaCanchada = await prisma.inventoryItem.create({
    data: {
      name: 'Yerba Canchada (Bolsa 50kg)',
      sku: 'INS-YER-001',
      currentStock: 500000, // 500kg
      unit: 'GRAMS',
      minStockAlert: 50000, // Alerta a los 50kg
      costPrice: 1500,
    },
  });

  const yerbaDespalada = await prisma.inventoryItem.create({
    data: {
      name: 'Yerba Despalada (Bolsa 50kg)',
      sku: 'INS-YER-002',
      currentStock: 500000,
      unit: 'GRAMS',
      minStockAlert: 50000,
      costPrice: 1800,
    },
  });

  const menta = await prisma.inventoryItem.create({
    data: {
      name: 'Menta Egipcia (Bolsa 10kg)',
      sku: 'INS-YUY-001',
      currentStock: 10000,
      unit: 'GRAMS',
      minStockAlert: 1000,
      costPrice: 5000,
    },
  });

  const burrito = await prisma.inventoryItem.create({
    data: {
      name: 'Burrito Serrano (Bolsa 10kg)',
      sku: 'INS-YUY-002',
      currentStock: 10000,
      unit: 'GRAMS',
      minStockAlert: 1000,
      costPrice: 6000,
    },
  });

  const mateCamioneroIns = await prisma.inventoryItem.create({
    data: {
      name: 'Mate Camionero Crudo',
      sku: 'INS-MAT-001',
      currentStock: 50,
      unit: 'UNITS',
      minStockAlert: 5,
      costPrice: 8000,
    },
  });

  const bombillaPicoLoro = await prisma.inventoryItem.create({
    data: {
      name: 'Bombilla Pico de Loro Alpaca',
      sku: 'INS-BOM-001',
      currentStock: 100,
      unit: 'UNITS',
      minStockAlert: 10,
      costPrice: 4000,
    },
  });

  console.log('📦 Inventory created');

  // 3. Crear Categorías
  const catYerbas = await prisma.category.create({
    data: { name: 'Yerbas', slug: 'yerbas' },
  });
  const catMates = await prisma.category.create({
    data: { name: 'Mates', slug: 'mates' },
  });
  const catAccesorios = await prisma.category.create({
    data: { name: 'Accesorios', slug: 'accesorios' },
  });

  // 4. Crear Productos y Variantes

  // Producto: Yerba Premium (Compuesto)
  const pYerbaPremium = await prisma.product.create({
    data: {
      name: 'Yerba Mate Premium',
      description:
        'Selección especial con estacionamiento natural de 24 meses.',
      slug: 'yerba-mate-premium',
      categoryId: catYerbas.id,
      images: ['https://placehold.co/600x400/2f855a/ffffff?text=Yerba+Premium'],
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: pYerbaPremium.id,
      name: '1kg',
      price: 4500,
      ingredients: {
        create: [
          { inventoryItemId: yerbaCanchada.id, quantityRequired: 700 },
          { inventoryItemId: yerbaDespalada.id, quantityRequired: 300 },
        ],
      },
    },
  });

  // Producto: Yerba Compuesta Serrana (Compuesto)
  const pYerbaSerrana = await prisma.product.create({
    data: {
      name: 'Yerba Mate Serrana',
      description: 'Con menta y burrito para un sabor refrescante.',
      slug: 'yerba-mate-serrana',
      categoryId: catYerbas.id,
      images: ['https://placehold.co/600x400/2f855a/ffffff?text=Yerba+Serrana'],
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: pYerbaSerrana.id,
      name: '500g',
      price: 2800,
      ingredients: {
        create: [
          { inventoryItemId: yerbaCanchada.id, quantityRequired: 400 },
          { inventoryItemId: yerbaDespalada.id, quantityRequired: 50 },
          { inventoryItemId: menta.id, quantityRequired: 25 },
          { inventoryItemId: burrito.id, quantityRequired: 25 },
        ],
      },
    },
  });

  // Producto: Mate Camionero (Simple, pero consume insumo)
  const pMateCamionero = await prisma.product.create({
    data: {
      name: 'Mate Camionero Uruguayo',
      description: 'Cuero vaqueta y virola de acero inoxidable.',
      slug: 'mate-camionero',
      categoryId: catMates.id,
      images: [
        'https://placehold.co/600x400/8c4b2f/ffffff?text=Mate+Camionero',
      ],
    },
  });

  const vMateCamionero = await prisma.productVariant.create({
    data: {
      productId: pMateCamionero.id,
      name: 'Marrón Habano',
      price: 25000,
      ingredients: {
        create: [{ inventoryItemId: mateCamioneroIns.id, quantityRequired: 1 }],
      },
    },
  });

  // Producto: Bombilla (Simple, stock directo o insumo)
  const pBombilla = await prisma.product.create({
    data: {
      name: 'Bombilla Pico de Loro',
      description: 'Alpaca de alta calidad, no se tapa.',
      slug: 'bombilla-pico-loro',
      categoryId: catAccesorios.id,
      images: ['https://placehold.co/600x400/silver/ffffff?text=Bombilla'],
    },
  });

  const vBombilla = await prisma.productVariant.create({
    data: {
      productId: pBombilla.id,
      name: 'Estándar',
      price: 8500,
      stock: 100, // Ejemplo de stock directo sin ingredientes (aunque podría tenerlos)
    },
  });

  console.log('🛍️ Products created');

  // 5. Crear Clientes
  const customer1 = await prisma.user.create({
    data: {
      email: 'cliente.fiel@test.com',
      name: 'Laura Cliente',
      role: 'USER',
    },
  });

  // 6. Crear Órdenes Históricas (Para métricas)
  // Orden 1: Completada (MERCADOPAGO)
  await prisma.order.create({
    data: {
      userId: customer1.id,
      customerName: 'Laura Cliente',
      customerEmail: 'cliente.fiel@test.com',
      status: OrderStatus.PAID,
      total: 33500,
      paymentProvider: PaymentProvider.MERCADOPAGO,
      items: {
        create: [
          { variantId: vMateCamionero.id, quantity: 1, price: 25000 },
          { variantId: vBombilla.id, quantity: 1, price: 8500 },
        ],
      },
      createdAt: new Date('2023-12-20'), // Fecha vieja para historial
    },
  });

  // Orden 2: Pendiente (CASH)
  await prisma.order.create({
    data: {
      customerName: 'Pepe Efectivo',
      customerEmail: 'pepe@guest.com',
      status: OrderStatus.PENDING,
      total: 4500,
      paymentProvider: PaymentProvider.CASH,
      items: {
        create: [
          // Buscar variante de 1kg
          {
            variantId: (await prisma.productVariant.findFirst({
              where: { name: '1kg' },
            }))!.id,
            quantity: 1,
            price: 4500,
          },
        ],
      },
    },
  });

  console.log('🛒 Orders created');
  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
