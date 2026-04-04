import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------

  async createCategory(dto: CreateCategoryDto) {
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

    // Verificar duplicados
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing)
      throw new BadRequestException(`Category slug '${slug}' already exists`);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
      },
    });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  // -------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------

  async create(dto: CreateCatalogDto) {
    const slug = dto.name
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');

    // Verificar si la categoría existe
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Category ID not found');
    }

    // TRANSACCIÓN: Todo o nada
    const newProduct = await this.prisma.$transaction(async (prisma) => {
      // 1. Crear Producto Base
      const product = await prisma.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          slug: `${slug}-${Date.now()}`,
          categoryId: dto.categoryId,
          isActive: dto.isActive ?? true,
        },
      });

      // 2. Si hay variantes, crearlas
      if (dto.variants && dto.variants.length > 0) {
        for (const variantDto of dto.variants) {
          // Crear la Variante
          const variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              name: variantDto.name,
              price: variantDto.price,
              stock: variantDto.stock,
            },
          });

          // 3. Si la variante tiene ingredientes (receta), crearlos
          if (variantDto.ingredients && variantDto.ingredients.length > 0) {
            const ingredientsData = variantDto.ingredients.map((ing) => ({
              variantId: variant.id,
              inventoryItemId: ing.inventoryItemId,
              quantityRequired: ing.quantityRequired,
            }));

            await prisma.variantIngredient.createMany({
              data: ingredientsData,
            });
          }
        }
      }

      // Retornar el producto completo
      return prisma.product.findUnique({
        where: { id: product.id },
        include: {
          variants: {
            include: {
              ingredients: {
                include: { inventoryItem: true },
              },
            },
          },
          category: true,
        },
      });
    });

    return this.mapProductWithStock(newProduct);
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapear cada producto para calcular el stock virtual
    return products.map((product) => this.mapProductWithStock(product));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        },
        category: true,
      },
    });

    if (!product) throw new NotFoundException(`Product #${id} not found`);

    return this.mapProductWithStock(product);
  }

  async update(id: string, updateCatalogDto: UpdateCatalogDto) {
    // Separamos variants para no intentar actualizar la relación directamente
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variants, ...productData } = updateCatalogDto;

    // Si el nombre cambia, regeneramos el slug
    const data: Record<string, any> = { ...productData };
    if (productData.name) {
      data.slug = productData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        variants: {
          include: {
            ingredients: { include: { inventoryItem: true } },
          },
        },
        category: true,
      },
    });

    return this.mapProductWithStock(product);
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async updateCategory(id: string, dto: CreateCategoryDto) {
    const slug = dto.slug
      ? dto.slug
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      : dto.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name, slug },
    });
  }

  async removeCategory(id: string) {
    const count = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (count > 0) {
      throw new BadRequestException(
        `No se puede eliminar: tiene ${count} producto(s) asociado(s). Mové o eliminá los productos primero.`,
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }

  /**
   * MÉTODO MÁGICO: Calcula el stock real disponible basado en recetas
   */
  private mapProductWithStock(product: any) {
    const variantsWithStock = product.variants.map((variant) => {
      let availableStock = 0;

      // 1. Si NO tiene ingredientes, usamos el stock manual (ej: Mate de Madera)
      if (!variant.ingredients || variant.ingredients.length === 0) {
        availableStock = variant.stock || 0;
      }
      // 2. Si TIENE ingredientes, calculamos cuánto podemos fabricar
      else {
        // Calculamos cuánto podemos hacer con CADA ingrediente
        const limits = variant.ingredients.map((ing) => {
          const rawStock = ing.inventoryItem.currentStock; // Stock de la bolsa madre (ej: 10000g)
          const required = ing.quantityRequired; // Cuánto usa esta variante (ej: 500g)

          if (required === 0) return 999999; // Evitar división por cero
          return Math.floor(rawStock / required);
        });

        // El stock real es el MÍNIMO de lo que permiten los ingredientes
        // (La cadena es tan fuerte como su eslabón más débil)
        availableStock = Math.min(...limits);
      }

      return {
        ...variant,
        stock: availableStock, // SOBREESCRIBIMOS el stock visual con el calculado
        isVirtualStock: variant.ingredients.length > 0, // Flag para saber si es calculado
      };
    });

    return {
      ...product,
      variants: variantsWithStock,
    };
  }
}
