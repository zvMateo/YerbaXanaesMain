import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsPublicController } from './settings-public.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  // El público va primero: si algún día se agrega `GET /settings/:id`, la ruta
  // literal /settings/public tiene que resolverse antes que el parámetro.
  controllers: [SettingsPublicController, SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
