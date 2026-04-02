import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { InventoryModule } from './inventory/inventory.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate Limiting global — 100 requests por minuto por IP
    // El webhook de MP está excluido via @SkipThrottle() en payments.controller.ts
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // ventana de 1 minuto (ms)
        limit: 100, // máximo 100 requests por IP por ventana
      },
    ]),
    AuthModule,
    UsersModule,
    PrismaModule,
    InventoryModule,
    CatalogModule,
    OrdersModule,
    CustomersModule,
    DashboardModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // ThrottlerGuard global — aplica a todos los endpoints automáticamente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
