import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env on its own. DATABASE_URL stays optional here so
// `prisma generate` works in builds that have no database (Docker, Vercel).
export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
