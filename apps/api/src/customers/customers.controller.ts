import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('customers')
@Controller('customers')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers with order stats' })
  async findAll() {
    return this.customersService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  async getStats() {
    return this.customersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID with order history' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
