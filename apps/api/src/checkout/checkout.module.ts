import { Module } from '@nestjs/common';
import { CheckoutPricingService } from './checkout-pricing.service';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CouponsModule, ShippingModule, SettingsModule],
  providers: [CheckoutPricingService],
  exports: [CheckoutPricingService],
})
export class CheckoutModule {}
