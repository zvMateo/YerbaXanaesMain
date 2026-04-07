export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  sku?: string;
  costPrice?: number;
  weight?: number;
  isVirtualStock?: boolean;
  ingredients?: VariantIngredient[];
  createdAt?: Date;
  updatedAt?: Date;
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
  isFeatured: boolean;
  images: string[];
  metaTitle?: string;
  metaDescription?: string;
  categoryId: string;
  category?: Category;
  variants?: ProductVariant[];
  ratings?: ProductRating[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRating {
  id: string;
  productId: string;
  userId?: string;
  orderId?: string;
  rating: number; // 1–5
  comment?: string;
  isApproved: boolean;
  createdAt: Date;
  user?: { name?: string; email: string };
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
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentProvider = "MERCADOPAGO" | "CASH" | "TRANSFER";
export type DiscountType = "PERCENTAGE" | "FIXED";

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
  discount?: OrderDiscount;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  currentUses: number;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface OrderDiscount {
  id: string;
  orderId: string;
  couponId: string;
  discountAmount: number;
  coupon?: Coupon;
}

// DTOs para crear entidades
export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
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
  sku?: string;
  costPrice?: number;
  weight?: number;
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
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
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
  couponCode?: string;
  items: CreateOrderItemInput[];
}

export interface CreateRatingInput {
  productId: string;
  rating: number;
  comment?: string;
  orderId?: string;
}

export interface CreateCouponInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}
