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
import { CreateRatingDto } from './dto/create-rating.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // POST /ratings — submit a review (público, el userId es opcional)
  @Post('ratings')
  create(
    @Body() dto: CreateRatingDto,
    @Request() req: { user?: { id?: string } },
  ) {
    return this.ratingsService.create({ ...dto, userId: req.user?.id });
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
