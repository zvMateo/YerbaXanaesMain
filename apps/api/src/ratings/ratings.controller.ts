import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import type { CreateRatingDto } from './ratings.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // POST /ratings — submit a review (público, el userId es opcional)
  @Post('ratings')
  create(@Body() body: CreateRatingDto, @CurrentUser() user?: { id: string }) {
    return this.ratingsService.create({ ...body, userId: user?.id });
  }

  // GET /products/:id/ratings — ratings aprobados de un producto
  @Get('products/:id/ratings')
  findByProduct(@Param('id') id: string, @Query('all') all: string) {
    const onlyApproved = all !== 'true';
    return this.ratingsService.findByProduct(id, onlyApproved);
  }

  // GET /ratings — todas las reseñas (solo admin)
  @Get('ratings')
  @UseGuards(AuthGuard)
  findAll() {
    return this.ratingsService.findAll();
  }

  // PATCH /ratings/:id/approve — aprobar reseña (solo admin)
  @Patch('ratings/:id/approve')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string) {
    return this.ratingsService.approve(id);
  }

  // PATCH /ratings/:id/reject — rechazar reseña (solo admin)
  @Patch('ratings/:id/reject')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string) {
    return this.ratingsService.reject(id);
  }

  // DELETE /ratings/:id — eliminar reseña (solo admin)
  @Delete('ratings/:id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.ratingsService.remove(id);
  }
}
