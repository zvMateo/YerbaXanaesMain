import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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
