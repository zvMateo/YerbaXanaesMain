import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.update({
    where: { email: "admin@yerbaxanaes.com" },
    data: { role: "ADMIN" },
  });
  console.log("✅ User promoted to ADMIN");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
