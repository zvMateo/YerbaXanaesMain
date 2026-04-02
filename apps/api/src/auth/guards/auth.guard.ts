import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
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

    // 2. Validar sesión en DB
    const session = await this.prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired');
    }

    // 3. Adjuntar usuario al request
    request['user'] = session.user;
    request['session'] = session;

    return true;
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
