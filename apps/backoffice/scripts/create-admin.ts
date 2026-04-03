import { auth } from "../lib/auth";

// ============================================================
// Script para crear el primer usuario ADMIN en producción.
//
// Uso:
//   1. Copiá el DATABASE_URL de Railway (desde las variables del servicio PostgreSQL)
//   2. Ejecutá:
//      DATABASE_URL="postgresql://..." bun run scripts/create-admin.ts
//
//   3. Opcionalmente personalizá email/password:
//      ADMIN_EMAIL="tu@email.com" ADMIN_PASSWORD="tu-password" bun run scripts/create-admin.ts
// ============================================================

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@yerbaxanaes.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const name = "Administrador";

  console.log(`Creando usuario admin: ${email}`);

  try {
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        role: "ADMIN",
      },
    });

    console.log("✅ Admin creado exitosamente");
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID:       ${user.user.id}`);
    console.log("");
    console.log(
      "⚠️  Cambiá la contraseña desde el panel después del primer login.",
    );
  } catch (error: any) {
    if (error?.message?.includes("already exists") || error?.status === 422) {
      console.log("ℹ️  El usuario ya existe en la base de datos.");
      console.log(
        "   Si necesitás resetear la contraseña, hacelo desde el panel de login.",
      );
    } else {
      console.error("❌ Error creando admin:", error);
    }
  }
}

main();
