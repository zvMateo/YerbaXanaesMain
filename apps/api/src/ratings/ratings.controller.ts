import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // POST /ratings — submit a review (público, el userId es opcional)
  @Post('ratings')
  create(
    @Body() body: Record<string, any>,
    @Request() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id;
    return this.ratingsService.create({
      productId: String(body['productId'] || ''),
      rating: Number(body['rating'] || 0),
      comment: body['comment'] ? String(body['comment']) : undefined,
      orderId: body['orderId'] ? String(body['orderId']) : undefined,
      userId,
    });
  }

  // GET /products/:id/ratings — ratings aprobados de un producto
  @Get('products/:id/ratings')
  findByProduct(@Param('id') id: string) {
    return this.ratingsService.findByProduct(id, true);
  }

  // GET /ratings — todas las reseñas (solo admin)
  @Get('ratings')
  @UseGuards(AuthGuard, AdminGuard)
  findAll() {
    return this.ratingsService.findAll();
  }

  // PATCH /ratings/:id/approve — aprobar reseña (solo admin)
  @Patch('ratings/:id/approve')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string) {
    return this.ratingsService.approve(id);
  }

  // PATCH /ratings/:id/reject — rechazar reseña (solo admin)
  @Patch('ratings/:id/reject')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string) {
    return this.ratingsService.reject(id);
  }

  // DELETE /ratings/:id — eliminar reseña (solo admin)
  @Delete('ratings/:id')
  @UseGuards(AuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.ratingsService.remove(id);
  }
}
