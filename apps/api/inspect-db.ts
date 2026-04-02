import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Inspecting DB...');

  const users = await prisma.user.findMany();
  console.log(`👥 Total Users: ${users.length}`);
  users.forEach((u) => console.log(` - ${u.email} [${u.role}]`));

  const sessions = await prisma.session.findMany({
    include: { user: true },
  });
  console.log(`🎟️ Active Sessions: ${sessions.length}`);
  sessions.forEach((s) =>
    console.log(
      ` - Token ends with ...${s.token.slice(-5)} for ${s.user.email}`,
    ),
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
