import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  create(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Get()
  findAll() {
    return this.catalogService.findAllCategories();
  }
}
