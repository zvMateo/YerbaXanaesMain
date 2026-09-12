import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import * as Sentry from '@sentry/nestjs';

/**
 * Traduce los errores conocidos de Prisma a códigos HTTP.
 *
 * Sin esto, un `update` sobre una fila que no existe sale como 500 con el
 * mensaje crudo de Prisma, que incluye el nombre de la query y de la tabla.
 *
 * El orden de registro importa: Nest invierte la lista de filtros globales
 * (`router-exception-filters.js` hace `filters.reverse()`) y usa el primero
 * que matchea. Como `SentryGlobalFilter` es `@Catch()` sin tipos, atrapa
 * todo. Para que este filtro corra, va DESPUÉS de él en `providers`.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.map(exception);

    // El detalle completo va al log, nunca al cliente.
    this.logger.warn(
      `Prisma ${exception.code}: ${exception.message.split('\n')[0]}`,
    );

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): HttpException {
    switch (exception.code) {
      case 'P2025':
        return new NotFoundException('El recurso solicitado no existe.');
      case 'P2002':
        return new ConflictException('Ya existe un registro con esos datos.');
      case 'P2003':
        return new BadRequestException('La referencia indicada no es válida.');
      default:
        // Un código que no mapeamos es un bug nuestro, no del cliente. Este
        // filtro corre antes que el de Sentry, así que si no reportamos acá
        // el error se pierde.
        Sentry.captureException(exception);
        return new InternalServerErrorException('Error interno del servidor.');
    }
  }
}
