import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // AuthGuard debería haber corrido antes
    }

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin privileges required');
    }

    return true;
  }
}
