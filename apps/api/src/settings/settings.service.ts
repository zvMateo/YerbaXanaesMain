import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { StoreSettings } from '@prisma/client';

const SINGLETON_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve la configuración actual. Si no existe la fila singleton, la crea
   * con los valores por defecto definidos en el schema.
   */
  async get(): Promise<StoreSettings> {
    return this.prisma.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  }

  /**
   * Actualiza la configuración aplicando solo los campos provistos (PATCH semantics).
   */
  async update(dto: UpdateSettingsDto): Promise<StoreSettings> {
    return this.prisma.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...dto },
      update: dto,
    });
  }
}
