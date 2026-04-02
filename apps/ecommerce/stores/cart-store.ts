// 📁 apps/ecommerce/stores/cart-store.ts
// Systems-Oriented: Estado global conectado al ecosistema

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, ProductVariant } from "@repo/types";

export interface CartItem {
  id: string; // unique ID for cart item
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  image?: string;
  stock: number; // Track available stock
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (
    product: Product,
    variant: ProductVariant,
    quantity?: number,
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Computed
  total: number;
  itemCount: number;
  subtotal: number;
  freeShippingThreshold: number;
  amountForFreeShipping: number;
  isFreeShipping: boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      freeShippingThreshold: 15000,

      addItem: (product, variant, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find(
          (item) => item.variantId === variant.id,
        );

        if (existingItem) {
          // Generative UI: Validar stock antes de agregar
          const newQuantity = existingItem.quantity + quantity;
          if (newQuantity > variant.stock) {
            throw new Error(`Solo hay ${variant.stock} unidades disponibles`);
          }

          set({
            items: items.map((item) =>
              item.variantId === variant.id
                ? { ...item, quantity: newQuantity }
                : item,
            ),
          });
        } else {
          if (quantity > variant.stock) {
            throw new Error(`Solo hay ${variant.stock} unidades disponibles`);
          }

          const newItem: CartItem = {
            id: `${product.id}-${variant.id}-${Date.now()}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            price: variant.price,
            quantity,
            image: product.images?.[0],
            stock: variant.stock,
          };

          set({ items: [...items, newItem] });
        }
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item,
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      get total() {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
      },

      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      get subtotal() {
        return get().total;
      },

      get isFreeShipping() {
        return get().total >= get().freeShippingThreshold;
      },

      get amountForFreeShipping() {
        const remaining = get().freeShippingThreshold - get().total;
        return remaining > 0 ? remaining : 0;
      },
    }),
    {
      name: "yerbaxanaes-cart",
      partialize: (state) => ({ items: state.items }), // Solo persistir items, no UI state
    },
  ),
);
