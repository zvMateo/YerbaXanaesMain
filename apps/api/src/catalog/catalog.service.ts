import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const productInclude = {
  variants: {
    include: {
      ingredients: {
        include: { inventoryItem: true },
      },
    },
  },
  category: true,
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

type VariantWithRelations = ProductWithRelations['variants'][number];

type VariantWithComputedStock = Omit<VariantWithRelations, 'stock'> & {
  stock: number;
  isVirtualStock: boolean;
};

type ProductWithComputedStock = Omit<ProductWithRelations, 'variants'> & {
  variants: VariantWithComputedStock[];
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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
          isFeatured: dto.isFeatured ?? false,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          images: dto.images || [],
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
              sku: variantDto.sku,
              costPrice: variantDto.costPrice,
              weight: variantDto.weight,
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
      const createdProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: productInclude,
      });

      if (!createdProduct) {
        throw new InternalServerErrorException(
          'No se pudo recuperar el producto recién creado',
        );
      }

      return createdProduct;
    });

    return this.mapProductWithStock(newProduct);
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Mapear cada producto para calcular el stock virtual
    return products.map((product) => this.mapProductWithStock(product));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) throw new NotFoundException(`Product #${id} not found`);

    return this.mapProductWithStock(product);
  }

  async update(id: string, updateCatalogDto: UpdateCatalogDto) {
    const { variants, ...productData } = updateCatalogDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar campos del producto
      const data: Prisma.ProductUncheckedUpdateInput = { ...productData };
      if (productData.images !== undefined) {
        data.images = productData.images;
      }
      if (productData.name) {
        data.slug = productData.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }

      await tx.product.update({ where: { id }, data });

      // 2. Si vienen variantes, reemplazarlas completamente (delete+create)
      if (variants !== undefined) {
        // Borrar ingredientes y variantes existentes
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true },
        });
        const variantIds = existingVariants.map((v) => v.id);

        await tx.variantIngredient.deleteMany({
          where: { variantId: { in: variantIds } },
        });
        await tx.productVariant.deleteMany({ where: { productId: id } });

        // Crear las nuevas variantes
        for (const variantDto of variants) {
          const variant = await tx.productVariant.create({
            data: {
              productId: id,
              name: variantDto.name,
              price: variantDto.price,
              stock: variantDto.stock,
              sku: variantDto.sku,
              costPrice: variantDto.costPrice,
              weight: variantDto.weight,
            },
          });

          if (variantDto.ingredients && variantDto.ingredients.length > 0) {
            await tx.variantIngredient.createMany({
              data: variantDto.ingredients.map((ing) => ({
                variantId: variant.id,
                inventoryItemId: ing.inventoryItemId,
                quantityRequired: ing.quantityRequired,
              })),
            });
          }
        }
      }

      // 3. Retornar producto actualizado
      const product = await tx.product.findUnique({
        where: { id },
        include: productInclude,
      });

      if (!product) {
        throw new NotFoundException(`Product #${id} not found`);
      }

      return this.mapProductWithStock(product);
    });
  }

  async remove(id: string) {
    // Primero verificamos que el producto exista
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product #${id} not found`);

    // Eliminamos variantes primero (y sus ingredientes en cascada)
    // luego el producto, todo en una transacción
    return this.prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.delete({ where: { id } });
    });
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

  // -------------------------------------------------------
  // IMAGES
  // -------------------------------------------------------

  async addImage(
    productId: string,
    fileBuffer: Buffer,
    mimetype: string,
    originalname: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    const url = await this.cloudinary.uploadImage(
      fileBuffer,
      mimetype,
      originalname,
    );

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { images: { push: url } },
      include: productInclude,
    });

    return this.mapProductWithStock(updatedProduct);
  }

  async removeImage(productId: string, imageUrl: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(`Product #${productId} not found`);

    if (!product.images.includes(imageUrl)) {
      throw new BadRequestException('La imagen no pertenece a este producto');
    }

    const publicId = this.cloudinary.extractPublicId(imageUrl);
    if (publicId) {
      await this.cloudinary.deleteImage(publicId);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        images: product.images.filter((img) => img !== imageUrl),
      },
      include: productInclude,
    });

    return this.mapProductWithStock(updatedProduct);
  }

  /**
   * MÉTODO MÁGICO: Calcula el stock real disponible basado en recetas
   */
  private mapProductWithStock(
    product: ProductWithRelations,
  ): ProductWithComputedStock {
    const variantsWithStock: VariantWithComputedStock[] = product.variants.map(
      (variant) => {
        let availableStock = 0;

        // 1. Si NO tiene ingredientes, usamos el stock manual (ej: Mate de Madera)
        if (!variant.ingredients || variant.ingredients.length === 0) {
          availableStock = variant.stock ?? 0;
        }
        // 2. Si TIENE ingredientes, calculamos cuánto podemos fabricar
        else {
          // Calculamos cuánto podemos hacer con CADA ingrediente
          const limits: number[] = variant.ingredients.map((ing) => {
            const rawStock = ing.inventoryItem.currentStock; // Stock de la bolsa madre (ej: 10000g)
            const required = ing.quantityRequired; // Cuánto usa esta variante (ej: 500g)

            if (required === 0) return Number.MAX_SAFE_INTEGER; // Evitar división por cero
            return Math.floor(rawStock / required);
          });

          // El stock real es el MÍNIMO de lo que permiten los ingredientes
          // (La cadena es tan fuerte como su eslabón más débil)
          availableStock = limits.length > 0 ? Math.min(...limits) : 0;
        }

        return {
          ...variant,
          stock: availableStock, // SOBREESCRIBIMOS el stock visual con el calculado
          isVirtualStock: variant.ingredients.length > 0, // Flag para saber si es calculado
        };
      },
    );

    return {
      ...product,
      variants: variantsWithStock,
    };
  }
}
