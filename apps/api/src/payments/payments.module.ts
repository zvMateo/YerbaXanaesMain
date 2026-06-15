import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsSyncService } from './payments-sync.service';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';

// PrismaService NO se declara acá: PrismaModule es @Global y lo provee como
// singleton. Declararlo localmente creaba un segundo PrismaClient (otro pool
// de conexiones) en el módulo más caliente — riesgo real en Railway Hobby.
@Module({
  imports: [CouponsModule, ShippingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsSyncService],
  exports: [PaymentsService, PaymentsSyncService],
})
export class PaymentsModule {}
