import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /**
   * GET /settings — Devuelve la configuración actual de la tienda.
   * Solo admins (backoffice).
   */
  @Get()
  @UseGuards(AuthGuard, AdminGuard)
  getSettings() {
    return this.settings.get();
  }

  /**
   * PUT /settings — Actualiza la configuración de la tienda.
   * Solo admins. Semántica PATCH: solo se actualizan los campos enviados.
   */
  @Put()
  @UseGuards(AuthGuard, AdminGuard)
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
