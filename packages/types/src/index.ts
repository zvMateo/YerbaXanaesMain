export interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: {
    products: number;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  minStockAlert?: number;
  unit: "GRAMS" | "UNITS";
  costPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  productId: string;
  isVirtualStock?: boolean;
  ingredients?: VariantIngredient[];
}

export interface VariantIngredient {
  id: string;
  variantId: string;
  inventoryItemId: string;
  quantityRequired: number;
  inventoryItem?: InventoryItem;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  images: string[];
  categoryId: string;
  category?: Category;
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  price: number;
  variant?: ProductVariant;
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentProvider = "MERCADOPAGO" | "CASH" | "TRANSFER";

export interface Order {
  id: string;
  total: number;
  status: OrderStatus;
  paymentProvider: PaymentProvider;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  userId?: string;
  items?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

// DTOs para crear entidades
export interface CreateCategoryInput {
  name: string;
  slug?: string;
}

export interface CreateInventoryInput {
  name: string;
  sku?: string;
  currentStock: number;
  minStockAlert?: number;
  unit: "GRAMS" | "UNITS";
  costPrice?: number;
}

export interface CreateProductVariantInput {
  name: string;
  price: number;
  stock?: number;
  ingredients?: {
    inventoryItemId: string;
    quantityRequired: number;
  }[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId: string;
  variants?: CreateProductVariantInput[];
  isActive?: boolean;
}

export interface CreateOrderItemInput {
  variantId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  userId?: string;
  paymentProvider?: PaymentProvider;
  items: CreateOrderItemInput[];
}
