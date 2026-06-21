import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { revalidateEcommerceCatalog } from './revalidate-ecommerce';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Tras una mutación HTTP exitosa (POST/PATCH/PUT/DELETE) en el controller donde
 * se aplica, dispara la revalidación del catálogo del ecommerce. Cubre productos,
 * imágenes e inventario sin instrumentar cada método del service.
 *
 * `tap` solo corre en el camino de éxito: si el handler lanza, no se revalida.
 */
@Injectable()
export class RevalidateCatalogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string }>();
    const isMutation = MUTATION_METHODS.has(request.method);

    return next.handle().pipe(
      tap(() => {
        if (isMutation) {
          revalidateEcommerceCatalog();
        }
      }),
    );
  }
}
