import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // POST /coupons — crear cupón (solo admin)
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: any) {
    return this.couponsService.create(body);
  }

  // GET /coupons — listar cupones (solo admin)
  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.couponsService.findAll();
  }

  // POST /coupons/validate — validar cupón (público, desde checkout)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() body: { code: string; orderAmount: number }) {
    return this.couponsService.validate(body.code, body.orderAmount);
  }

  // PATCH /coupons/:id/toggle — activar/desactivar (solo admin)
  @Patch(':id/toggle')
  @UseGuards(AuthGuard)
  toggle(@Param('id') id: string) {
    return this.couponsService.toggleActive(id);
  }

  // DELETE /coupons/:id — eliminar (solo admin)
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
