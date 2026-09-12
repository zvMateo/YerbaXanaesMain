import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { InventoryModule } from './inventory/inventory.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentsModule } from './payments/payments.module';
import { ShippingModule } from './shipping/shipping.module';
import { RatingsModule } from './ratings/ratings.module';
import { CouponsModule } from './coupons/coupons.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { SettingsModule } from './settings/settings.module';
import { CheckoutModule } from './checkout/checkout.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

@Module({
  imports: [
    // Sentry (no-op si no hay SENTRY_DSN / instrument no inicializó)
    SentryModule.forRoot(),
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
    NotificationsModule,
    InventoryModule,
    CatalogModule,
    OrdersModule,
    CustomersModule,
    DashboardModule,
    PaymentsModule,
    ShippingModule,
    RatingsModule,
    CouponsModule,
    CloudinaryModule,
    SettingsModule,
    CheckoutModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // PrismaService lo provee PrismaModule (@Global). No re-declararlo acá:
    // evita instanciar un PrismaClient extra con su propio pool de conexiones.
    // ThrottlerGuard global — aplica a todos los endpoints automáticamente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Captura excepciones no manejadas en Sentry (si DSN configurado)
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    // Nest invierte la lista de filtros globales, asi que este corre ANTES
    // que el de Sentry. Va ultimo a proposito: SentryGlobalFilter es un
    // @Catch() sin tipos y si corriera primero se quedaria con los errores
    // de Prisma y los devolveria como 500.
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}
