import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001';

async function main() {
  console.log('🧪 Testing API Authentication...');

  // 1. Get admin user
  const user = await prisma.user.findFirst({
    where: { email: 'admin@yerbaxanaes.com' },
  });
  if (!user) throw new Error('User not found');

  // 2. Create a fresh session
  const token = `test-token-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // Expires tomorrow

  await prisma.session.create({
    data: {
      id: `sess-${Date.now()}`,
      token,
      userId: user.id,
      expiresAt,
      ipAddress: '127.0.0.1',
      userAgent: 'TestScript/1.0',
    },
  });

  console.log(`🔑 Created session token: ${token}`);

  // 3. Test API endpoint with X-Session-Token header
  console.log(`📡 Sending request to ${API_URL}/dashboard/metrics...`);

  try {
    const response = await fetch(`${API_URL}/dashboard/metrics`, {
      headers: {
        'X-Session-Token': token,
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `📥 Response Status: ${response.status} ${response.statusText}`,
    );

    if (response.ok) {
      const data = await response.json();
      console.log(
        '✅ SUCCESS! Data received:',
        JSON.stringify(data).slice(0, 100) + '...',
      );
    } else {
      console.log('❌ FAILED!');
      const text = await response.text();
      console.log('Response body:', text);
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
  } finally {
    // Cleanup
    await prisma.session.delete({ where: { token } });
    await prisma.$disconnect();
  }
}

main();
