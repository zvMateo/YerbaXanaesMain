import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType, Prisma } from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';

export interface ValidateCouponResult {
  valid: true;
  couponId: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('El código ya existe');

    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { discounts: true } } },
    });
  }

  async toggleActive(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Cupón no encontrado');
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Cupón no encontrado');
    return this.prisma.coupon.delete({ where: { id } });
  }

  /**
   * Validates a coupon code against an order amount.
   * Returns the discount to apply or throws BadRequestException.
   */
  async validate(
    code: string,
    orderAmount: number,
  ): Promise<ValidateCouponResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) throw new BadRequestException('Código de cupón inválido');
    if (!coupon.isActive)
      throw new BadRequestException('El cupón no está activo');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('El cupón ha expirado');
    }
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      throw new BadRequestException('El cupón ha alcanzado su límite de usos');
    }
    if (
      coupon.minOrderAmount !== null &&
      orderAmount < Number(coupon.minOrderAmount)
    ) {
      throw new BadRequestException(
        `Monto mínimo para este cupón: $${Number(coupon.minOrderAmount)}`,
      );
    }

    const discountAmount =
      coupon.discountType === DiscountType.PERCENTAGE
        ? (orderAmount * Number(coupon.discountValue)) / 100
        : Math.min(Number(coupon.discountValue), orderAmount);

    return {
      valid: true,
      couponId: coupon.id,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount: Math.round(discountAmount * 100) / 100,
    };
  }

  /**
   * Called inside a transaction after the order is created.
   * Records the discount and increments currentUses.
   */
  async applyToOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    couponId: string,
    discountAmount: number,
  ) {
    await tx.orderDiscount.create({
      data: { orderId, couponId, discountAmount },
    });
    await tx.coupon.update({
      where: { id: couponId },
      data: { currentUses: { increment: 1 } },
    });
  }
}
