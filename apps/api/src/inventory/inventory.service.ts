import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    // Update condicional atómico: el WHERE garantiza que el stock nunca
    // quede negativo aunque haya ajustes concurrentes sobre el mismo item
    // (evita el read-modify-write donde dos requests leen el mismo valor).
    const result = await this.prisma.inventoryItem.updateMany({
      where: {
        id,
        ...(quantityChange < 0
          ? { currentStock: { gte: Math.abs(quantityChange) } }
          : {}),
      },
      data: { currentStock: { increment: quantityChange } },
    });

    if (result.count === 0) {
      // Distinguir "no existe" (findOne lanza NotFoundException)
      // de "existe pero no alcanza el stock"
      const item = await this.findOne(id);
      throw new BadRequestException(
        `Stock insuficiente para ${item.name}. Stock actual: ${item.currentStock}, Intentaste restar: ${Math.abs(quantityChange)}`,
      );
    }

    return this.findOne(id);
  }
}
