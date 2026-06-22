import { auth } from "../lib/auth";

// ============================================================
// Script para crear el primer usuario ADMIN en producción.
//
// Uso (ADMIN_EMAIL y ADMIN_PASSWORD son OBLIGATORIOS — sin defaults inseguros):
//   1. Copiá el DATABASE_URL de Railway (desde las variables del servicio PostgreSQL)
//   2. Ejecutá:
//      DATABASE_URL="postgresql://..." \
//      ADMIN_EMAIL="tu@email.com" ADMIN_PASSWORD="<contraseña-fuerte-min-12>" \
//      bun run scripts/create-admin.ts
// ============================================================

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = "Administrador";

  if (!email || !password) {
    console.error(
      "❌ Faltan credenciales. Pasá ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.",
    );
    console.error(
      '   Ej: ADMIN_EMAIL="admin@tudominio.com" ADMIN_PASSWORD="<contraseña-fuerte>" bun run scripts/create-admin.ts',
    );
    process.exit(1);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `❌ ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
    process.exit(1);
  }

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
    console.log(`   Email: ${email}`);
    console.log(`   ID:    ${user.user.id}`);
    console.log("");
    console.log(
      "⚠️  Guardá la contraseña en tu gestor; no se vuelve a mostrar.",
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
