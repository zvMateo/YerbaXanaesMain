import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST público — lo usa el ecommerce para crear órdenes (CASH/TRANSFER)
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  // POST público — validación de stock antes del checkout
  @Post('validate')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  validateStock(
    @Body() data: { items: { variantId: string; quantity: number }[] },
  ) {
    return this.ordersService.validateStock(data.items);
  }

  // Lectura y escritura admin solo para backoffice autenticado
  @Get()
  @UseGuards(AuthGuard, AdminGuard)
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard, AdminGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
