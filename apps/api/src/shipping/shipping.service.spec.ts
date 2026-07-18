import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Configuración de remitente (CA_SENDER_*) para /shipping/import.
 *
 * MiCorreo no expone ningún endpoint para leer el perfil del remitente, así
 * que un sender mal configurado sólo se descubre cuando falla un import real
 * — y los imports no se pueden cancelar por API. De ahí que la coherencia se
 * valide localmente antes de tocar la API.
 */
describe('ShippingService - Configuración del remitente', () => {
  const SENDER_COMPLETO = {
    CA_SENDER_NAME: 'YerbaXanaes',
    CA_SENDER_STREET: 'San Martin',
    CA_SENDER_NUMBER: '1234',
    CA_SENDER_CITY: 'Villa del Rosario',
    CA_SENDER_PROVINCE_CODE: 'X',
    CA_SENDER_POSTAL_CODE: '5963',
  };

  const buildService = async (
    env: Record<string, string>,
  ): Promise<ShippingService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
        {
          provide: PrismaService,
          useValue: { order: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    return module.get<ShippingService>(ShippingService);
  };

  it('sin ninguna CA_SENDER_* delega el remitente al perfil del dashboard', async () => {
    const service = await buildService({});

    expect((service as any).getSenderConfigStatus()).toEqual({
      state: 'none',
      missing: [],
    });
  });

  it('con todas las obligatorias marca la config como completa', async () => {
    const service = await buildService(SENDER_COMPLETO);

    expect((service as any).getSenderConfigStatus()).toEqual({
      state: 'complete',
      missing: [],
    });
  });

  it('detecta el set parcial y nombra exactamente lo que falta', async () => {
    // Caso realista: se cargó el nombre y la calle, y quedó afuera el resto.
    const service = await buildService({
      CA_SENDER_NAME: SENDER_COMPLETO.CA_SENDER_NAME,
      CA_SENDER_STREET: SENDER_COMPLETO.CA_SENDER_STREET,
    });

    expect((service as any).getSenderConfigStatus()).toEqual({
      state: 'partial',
      missing: [
        'CA_SENDER_NUMBER',
        'CA_SENDER_CITY',
        'CA_SENDER_PROVINCE_CODE',
        'CA_SENDER_POSTAL_CODE',
      ],
    });
  });

  it('trata los valores en blanco como ausentes', async () => {
    const service = await buildService({
      ...SENDER_COMPLETO,
      CA_SENDER_POSTAL_CODE: '   ',
    });

    expect((service as any).getSenderConfigStatus()).toEqual({
      state: 'partial',
      missing: ['CA_SENDER_POSTAL_CODE'],
    });
  });

  it('una opcional suelta ya cuenta como config parcial', async () => {
    // Sin esto, definir sólo CA_SENDER_EMAIL mandaría un sender con el email
    // cargado y el resto en null, en vez de delegar al dashboard.
    const service = await buildService({ CA_SENDER_EMAIL: 'envios@yerba.com' });

    expect((service as any).getSenderConfigStatus().state).toBe('partial');
  });

  it('importShipping corta antes de llamar a MiCorreo si el sender está a medias', async () => {
    const service = await buildService({
      CA_USER_TOKEN: 'tok',
      CA_PASSWORD_TOKEN: 'pass',
      CA_CUSTOMER_ID: '0090000025',
      CA_SENDER_NAME: SENDER_COMPLETO.CA_SENDER_NAME,
    });

    const fetchSpy = jest
      .spyOn<any, any>(service as any, 'miCorreoFetch')
      .mockResolvedValue({ ok: true, data: {} });

    // Se afirma el mensaje, no sólo el tipo: sin el guard este flujo también
    // falla (NotFoundException por la orden inexistente), y un toThrow genérico
    // pasaría en verde sin probar nada.
    await expect(service.importShipping('order-1')).rejects.toThrow(
      /Datos del remitente incompletos.*CA_SENDER_NUMBER/s,
    );
    await expect(service.importShipping('order-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    // Lo que se protege es la llamada irreversible: MiCorreo no tiene endpoint
    // para cancelar un envío ya importado.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
