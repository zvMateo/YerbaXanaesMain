import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// Railway Hobby tiene un cupo bajo de conexiones a Postgres. Si la DATABASE_URL
// no define explícitamente los límites de pool, aplicamos defaults conservadores
// para no agotar el cupo bajo carga (varios procesos comparten la misma DB).
const DEFAULT_CONNECTION_LIMIT = '5';
const DEFAULT_POOL_TIMEOUT = '10';

function withPoolDefaults(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', DEFAULT_CONNECTION_LIMIT);
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', DEFAULT_POOL_TIMEOUT);
    }
    return url.toString();
  } catch {
    // No es una URL parseable: la devolvemos tal cual y dejamos que Prisma
    // falle con su propio mensaje de error descriptivo.
    return rawUrl;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    super({
      datasourceUrl: withPoolDefaults(
        configService.get<string>('DATABASE_URL'),
      ),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
