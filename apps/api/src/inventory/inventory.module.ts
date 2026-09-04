import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryReservationService } from './inventory-reservation.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryReservationService],
  // La reserva y liberacion de stock la consumen payments y orders.
  exports: [InventoryReservationService],
})
export class InventoryModule {}
