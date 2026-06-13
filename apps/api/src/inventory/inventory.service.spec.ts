import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const prismaMock = {
    inventoryItem: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('adjustStock', () => {
    const item = {
      id: 'item-1',
      name: 'Yerba Granel',
      currentStock: 100,
    };

    it('incrementa stock con update atómico (sin guard de mínimo)', async () => {
      prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        ...item,
        currentStock: 150,
      });

      const result = await service.adjustStock('item-1', 50);

      expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { currentStock: { increment: 50 } },
      });
      expect(result.currentStock).toBe(150);
    });

    it('decrementa stock exigiendo currentStock >= cantidad en el WHERE', async () => {
      prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        ...item,
        currentStock: 70,
      });

      const result = await service.adjustStock('item-1', -30);

      expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', currentStock: { gte: 30 } },
        data: { currentStock: { increment: -30 } },
      });
      expect(result.currentStock).toBe(70);
    });

    it('lanza BadRequestException si el item existe pero no alcanza el stock', async () => {
      prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.inventoryItem.findUnique.mockResolvedValue(item);

      await expect(service.adjustStock('item-1', -500)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException si el item no existe', async () => {
      prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.adjustStock('missing', -10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('no hace lectura previa al update (sin read-modify-write)', async () => {
      prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.inventoryItem.findUnique.mockResolvedValue(item);

      await service.adjustStock('item-1', -10);

      const findOrder =
        prismaMock.inventoryItem.findUnique.mock.invocationCallOrder[0];
      const updateOrder =
        prismaMock.inventoryItem.updateMany.mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(findOrder);
    });
  });
});
