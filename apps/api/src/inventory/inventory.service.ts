import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryDto) {
    return this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        currentStock: dto.currentStock,
        unit: dto.unit,
        minStockAlert: dto.minStockAlert,
        costPrice: dto.costPrice,
      },
    });
  }

  async findAll() {
    return this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException(`Inventory Item #${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateInventoryDto) {
    // Primero verificar si existe
    await this.findOne(id);

    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: string) {
    // Primero verificar si existe
    await this.findOne(id);
    return this.prisma.inventoryItem.delete({
      where: { id },
    });
  }

  // MÉTODO ESPECIAL: Ajuste de Stock (+ o -)
  async adjustStock(id: string, quantityChange: number) {
    const item = await this.findOne(id);
    const newStock = item.currentStock + quantityChange;

    if (newStock < 0) {
      throw new Error(
        `Stock insuficiente para ${item.name}. Stock actual: ${item.currentStock}, Intentaste restar: ${Math.abs(quantityChange)}`,
      );
    }

    return this.prisma.inventoryItem.update({
      where: { id },
      data: { currentStock: newStock },
    });
  }
}
