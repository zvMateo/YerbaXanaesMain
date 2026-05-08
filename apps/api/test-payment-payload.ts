import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001';

// SIMULAMOS SER EL FRONTEND
async function main() {
  console.log('💳 Testing Mercado Pago Integration...');

  // 1. Obtener un usuario y un producto real
  const user = await prisma.user.findFirst({ where: { role: 'USER' } });
  const variant = await prisma.productVariant.findFirst({
    include: { product: true },
  });

  if (!user || !variant) {
    console.error('❌ Need users and products in DB. Run seed first.');
    return;
  }

  console.log(`👤 Customer: ${user.email}`);
  console.log(
    `📦 Item: ${variant.product.name} - ${variant.name} ($${variant.price})`,
  );

  // 2. Inicializar Payment Brick (POST /payments/brick-init)
  // Para simplificar y probar manualmente, imprimimos el payload para Postman.

  const payload = {
    orderItems: [
      {
        variantId: variant.id,
        quantity: 1,
      },
    ],
    customerEmail: user.email,
    customerName: user.name,
    deliveryType: 'pickup',
    shippingCost: 0,
    shippingProvider: 'pickup',
  };

  console.log(
    '\n🚀 SEND THIS TO POSTMAN (POST http://localhost:3001/payments/brick-init):',
  );
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nHeaders:');
  console.log('X-Session-Token: [TU_TOKEN_DE_SESION_DEL_BROWSER]');

  console.log(
    '\n⚠️ Recuerda: Necesitas configurar MP_ACCESS_TOKEN en apps/api/.env primero.',
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
