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
  /** Defaults alineados con la marca pública del ecommerce (Villa del Rosario). */
  private readonly brandDefaults = {
    businessName: 'YerbaXanaes',
    email: 'yerbaxanaes@gmail.com',
    phone: '+54 9 3573 50-0348',
    address: 'Villa del Rosario',
    city: 'Córdoba, Argentina',
    notificationEmail: 'yerbaxanaes@gmail.com',
    freeShippingThreshold: 15000,
  } as const;

  async get(): Promise<StoreSettings> {
    return this.prisma.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...this.brandDefaults },
      update: {},
    });
  }

  /**
   * Actualiza la configuración aplicando solo los campos provistos (PATCH semantics).
   */
  async update(dto: UpdateSettingsDto): Promise<StoreSettings> {
    return this.prisma.storeSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...this.brandDefaults, ...dto },
      update: dto,
    });
  }
}
