import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Session, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type SessionWithUser = Session & { user: User };

interface CachedSession {
  data: SessionWithUser;
  /** epoch ms hasta el que la entrada de cache es válida (TTL del cache) */
  cachedUntil: number;
}

/** TTL del cache de sesiones. Balancea menos queries vs. latencia de revocación. */
const SESSION_CACHE_TTL_MS = 60_000;
/** Backstop anti-leak: tope de entradas antes de podar/vaciar. */
const MAX_CACHE_ENTRIES = 1_000;

@Injectable()
export class AuthGuard implements CanActivate {
  // Cache in-memory de sesiones compartido entre requests (AuthGuard es singleton
  // en el DI de Nest). Evita 1 query a DB por cada request autenticado.
  // Trade-off conocido: una sesión revocada/borrada se sigue aceptando hasta
  // SESSION_CACHE_TTL_MS. Aceptable para el backoffice (pocos admins); revisar
  // si en el futuro se necesita revocación inmediata.
  private readonly sessionCache = new Map<string, CachedSession>();

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extraer token (Header > Cookie)
    let sessionToken = this.extractTokenFromHeader(request);
    if (!sessionToken) {
      // Intentar leer de cookie si viaja (CORS allow credentials debe estar true)
      // Nota: NestJS requiere cookie-parser para request.cookies,
      // si no está, hay que parsear el header 'cookie' manualmente.
      sessionToken = this.extractTokenFromCookie(request);
    }

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    // 2. Resolver sesión (cache in-memory con fallback a DB)
    const session = await this.resolveSession(sessionToken);

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (new Date() > session.expiresAt) {
      // Sesión vencida: purgar del cache para no reutilizarla durante el TTL
      this.sessionCache.delete(sessionToken);
      throw new UnauthorizedException('Session expired');
    }

    // 3. Adjuntar usuario al request
    request['user'] = session.user;
    request['session'] = session;

    return true;
  }

  /** Devuelve la sesión desde cache si está vigente; si no, consulta la DB y cachea. */
  private async resolveSession(token: string): Promise<SessionWithUser | null> {
    const now = Date.now();

    const cached = this.sessionCache.get(token);
    if (cached && cached.cachedUntil > now) {
      return cached.data;
    }

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (session) {
      this.cacheSession(token, session, now);
    } else {
      // Token inválido: asegurar que no quede una entrada vieja cacheada
      this.sessionCache.delete(token);
    }

    return session;
  }

  private cacheSession(
    token: string,
    data: SessionWithUser,
    now: number,
  ): void {
    if (this.sessionCache.size >= MAX_CACHE_ENTRIES) {
      this.pruneExpired(now);
      // Si tras podar sigue lleno, vaciar (backstop simple anti-leak)
      if (this.sessionCache.size >= MAX_CACHE_ENTRIES) {
        this.sessionCache.clear();
      }
    }

    this.sessionCache.set(token, {
      data,
      cachedUntil: now + SESSION_CACHE_TTL_MS,
    });
  }

  private pruneExpired(now: number): void {
    for (const [token, entry] of this.sessionCache) {
      if (entry.cachedUntil <= now) {
        this.sessionCache.delete(token);
      }
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(request: any): string | undefined {
    // Si usas cookie-parser: return request.cookies['better-auth.session_token'];
    // Manual:
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    // Buscar 'better-auth.session_token=' o tu prefijo
    const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
    return match ? match[1] : undefined;
  }
}
