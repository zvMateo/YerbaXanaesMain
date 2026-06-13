/**
 * Script para limpiar todas las tablas de Better Auth (User, Session, Account, Verification).
 * Los datos de negocio (orders, products, inventory) NO se tocan.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." bunx ts-node scripts/clean-auth-users.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verificando usuarios existentes...\n");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
  });

  if (users.length === 0) {
    console.log("✅ No hay usuarios. La DB ya está limpia.");
    return;
  }

  console.log(`Usuarios encontrados (${users.length}):`);
  users.forEach((u) => {
    console.log(`  - ${u.email} | rol: ${u.role} | creado: ${u.createdAt.toISOString()}`);
  });

  console.log("\n⚠️  Se van a eliminar TODOS los usuarios, sesiones, cuentas y verificaciones.");
  console.log("   Los datos de órdenes, productos e inventario NO se tocan.\n");

  // Cascade: borrar User elimina Session y Account automáticamente
  const [deletedVerifications, deletedUsers] = await prisma.$transaction([
    prisma.verification.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log(`✅ Verificaciones eliminadas: ${deletedVerifications.count}`);
  console.log(`✅ Usuarios eliminados: ${deletedUsers.count}`);
  console.log("\n🎉 Listo. La próxima vez que luzavala419@gmail.com inicie sesión");
  console.log("   con Google, se creará automáticamente con rol ADMIN.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
