import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { CategoryController } from './category.controller';

@Module({
  controllers: [CatalogController, CategoryController],
  providers: [CatalogService],
})
export class CatalogModule {}
