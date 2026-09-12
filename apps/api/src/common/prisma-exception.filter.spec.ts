import { ArgumentsHost, Controller, Get, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import type { Server } from 'http';
import { PrismaExceptionFilter } from './prisma-exception.filter';

/**
 * Un error de Prisma tal como lo lanza el cliente: el mensaje trae el nombre
 * de la query y de la tabla, que es justamente lo que no puede salir al
 * cliente.
 */
function prismaError(code: string, message = 'error de prisma') {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: '6.2.1',
  });
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    // El detalle completo se loguea siempre; acá sólo evitamos el ruido.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mapea P2025 a 404', () => {
    filter.catch(prismaError('P2025'), host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('mapea P2002 a 409', () => {
    filter.catch(prismaError('P2002'), host);

    expect(status).toHaveBeenCalledWith(409);
  });

  it('mapea P2003 a 400', () => {
    filter.catch(prismaError('P2003'), host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('mapea un codigo desconocido a 500', () => {
    filter.catch(prismaError('P9999'), host);

    expect(status).toHaveBeenCalledWith(500);
  });

  it('no expone detalles internos en el mensaje', () => {
    const error = prismaError(
      'P2025',
      'Invalid `prisma.order.update()` on table "Order"',
    );

    filter.catch(error, host);

    const body = json.mock.calls[0][0] as { message: string };
    expect(body.message).not.toContain('prisma.');
    expect(body.message).not.toContain('Order');
  });

  it('responde con el mismo formato que las excepciones de Nest', () => {
    filter.catch(prismaError('P2025'), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'El recurso solicitado no existe.',
      error: 'Not Found',
    });
  });

  it('loguea el codigo de Prisma para poder diagnosticar', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');

    filter.catch(prismaError('P2002', 'Unique constraint failed'), host);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('P2002'));
  });
});

@Controller('prueba-prisma')
class ErrorController {
  @Get()
  boom() {
    throw prismaError('P2025', 'Invalid `prisma.order.update()` on "Order"');
  }
}

/**
 * Nest invierte la lista de filtros globales y usa el primero que matchea,
 * así que el orden en `providers` decide quién gana. Este test levanta la app
 * con los dos filtros en el mismo orden que app.module.ts: si alguien los
 * reordena, el error de Prisma vuelve a salir como 500 y esto falla.
 */
describe('PrismaExceptionFilter — orden frente a SentryGlobalFilter', () => {
  let server: Server;
  let app: Awaited<ReturnType<typeof buildApp>>;

  async function buildApp() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ErrorController],
      providers: [
        { provide: APP_FILTER, useClass: SentryGlobalFilter },
        { provide: APP_FILTER, useClass: PrismaExceptionFilter },
      ],
    }).compile();

    const instance = moduleRef.createNestApplication();
    await instance.init();
    return instance;
  }

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    app = await buildApp();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('devuelve 404 y no 500 cuando el error pasa por los filtros reales', async () => {
    const res = await request(server).get('/prueba-prisma');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('El recurso solicitado no existe.');
    expect(JSON.stringify(res.body)).not.toContain('prisma.');
  });
});
