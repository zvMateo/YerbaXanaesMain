import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsSyncService } from './payments-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [CouponsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsSyncService, PrismaService],
  exports: [PaymentsService, PaymentsSyncService],
})
export class PaymentsModule {}
