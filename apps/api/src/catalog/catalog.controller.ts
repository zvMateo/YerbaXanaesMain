import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean } from 'class-validator';
import { CatalogService } from './catalog.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

class UpdateProductStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // GET público — lo consume el ecommerce sin autenticación
  @Get()
  findAll() {
    return this.catalogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(id);
  }

  // Escritura solo para admins autenticados
  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  create(@Body() createCatalogDto: CreateCatalogDto) {
    return this.catalogService.create(createCatalogDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() updateCatalogDto: UpdateCatalogDto) {
    return this.catalogService.update(id, updateCatalogDto);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, AdminGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.catalogService.toggleStatus(id, dto.isActive);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.catalogService.remove(id);
  }

  @Post(':id/images')
  @UseGuards(AuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit para HEIC
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif',
        ];

        // El navegador a veces manda .HEIC como 'application/octet-stream' o vacío
        const isHeicExtension =
          file.originalname &&
          file.originalname.toLowerCase().match(/\.(heic|heif)$/);

        if (allowedTypes.includes(file.mimetype) || isHeicExtension) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Received mimetype: ${file.mimetype} and name: ${file.originalname}. Only JPG, PNG, WebP, and HEIC are allowed.`,
            ),
            false,
          );
        }
      },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded or invalid file format.');
    }
    return this.catalogService.addImage(
      id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  @Delete(':id/images')
  @UseGuards(AuthGuard, AdminGuard)
  removeImage(@Param('id') id: string, @Body('url') url: string) {
    return this.catalogService.removeImage(id, url);
  }
}
