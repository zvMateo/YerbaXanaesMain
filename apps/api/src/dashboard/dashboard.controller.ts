import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService, Alert } from './dashboard.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async getMetrics(): Promise<Record<string, unknown>> {
    return this.dashboardService.getMetrics();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get dashboard alerts' })
  async getAlerts(): Promise<Alert[]> {
    return this.dashboardService.getAlerts();
  }
}
