import { auth } from "../lib/auth";

async function main() {
  console.log("Creating admin user...");

  try {
    const user = await auth.api.signUpEmail({
      body: {
        email: "admin@yerbaxanaes.com",
        password: "admin123",
        name: "Administrador",
      },
    });

    console.log("✅ Admin created successfully:", user);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
}

main();
