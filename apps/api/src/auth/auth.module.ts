import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuthGuard, AdminGuard],
  exports: [AuthGuard, AdminGuard],
})
export class AuthModule {}
