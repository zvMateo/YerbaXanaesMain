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

  // 2. Crear Checkout (Simulando POST /payments/checkout)
  // Necesitamos llamar a la API real, pero como requiere auth (token),
  // vamos a "hacer trampa" e invocar el servicio directamente si estuviéramos en Nest,
  // pero como es script externo, mejor hacemos un fetch con un token de admin mockeado o
  // creamos la preferencia manualmente usando el script para ver si devuelve el link.

  // Para simplificar y probar AHORA, vamos a imprimir los datos que deberías enviar a Postman.

  const payload = {
    items: [
      {
        variantId: variant.id,
        quantity: 1,
      },
    ],
    customerEmail: user.email,
    customerName: user.name,
    userId: user.id,
  };

  console.log(
    '\n🚀 SEND THIS TO POSTMAN (POST http://localhost:3001/payments/checkout):',
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
