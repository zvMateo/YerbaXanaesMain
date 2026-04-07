import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateRatingDto {
  productId: string;
  rating: number; // 1–5
  comment?: string;
  orderId?: string;
  userId?: string;
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRatingDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('El rating debe ser entre 1 y 5');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    return this.prisma.productRating.create({
      data: {
        productId: dto.productId,
        userId: dto.userId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        isApproved: false,
      },
    });
  }

  async findByProduct(productId: string, onlyApproved = true) {
    const ratings = await this.prisma.productRating.findMany({
      where: {
        productId,
        ...(onlyApproved ? { isApproved: true } : {}),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const avg =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      ratings,
      avgRating: Math.round(avg * 10) / 10,
      totalRatings: ratings.length,
    };
  }

  async findAll() {
    return this.prisma.productRating.findMany({
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string) {
    const rating = await this.prisma.productRating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Reseña no encontrada');
    return this.prisma.productRating.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  async reject(id: string) {
    const rating = await this.prisma.productRating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Reseña no encontrada');
    return this.prisma.productRating.update({
      where: { id },
      data: { isApproved: false },
    });
  }

  async remove(id: string) {
    const rating = await this.prisma.productRating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Reseña no encontrada');
    return this.prisma.productRating.delete({ where: { id } });
  }
}
