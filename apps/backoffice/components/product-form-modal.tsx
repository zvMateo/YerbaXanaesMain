"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Package, Scale, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
  type Product,
  type ProductVariant,
} from "@/hooks/use-products";
import { useInventory, type InventoryItem } from "@/hooks/use-inventory";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

// ============================================================
// TIPOS INTERNOS
// ============================================================

type ProductType = "packaged" | "bulk";

interface VariantForm {
  name: string;
  price: number;
  stock: number; // Para pre-empacados
  inventoryItemId: string; // Para a granel
  quantityRequired: number; // Gramos que consume del insumo
}

// ============================================================
// COMPONENTE
// ============================================================

export function ProductFormModal({
  open,
  onClose,
  product,
}: ProductFormModalProps) {
  const isEditing = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useCategories();
  const { data: inventory = [] } = useInventory();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [productType, setProductType] = useState<ProductType>("packaged");
  const [variants, setVariants] = useState<VariantForm[]>([
    { name: "", price: 0, stock: 0, inventoryItemId: "", quantityRequired: 0 },
  ]);

  // Filtrar solo insumos a granel (GRAMS)
  const bulkItems = inventory.filter((item) => item.unit === "GRAMS");

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setCategoryId(product.categoryId);
      setIsActive(product.isActive);

      // Detectar tipo: si tiene ingredientes es "a granel"
      const hasIngredients = product.variants.some(
        (v: ProductVariant) => v.ingredients && v.ingredients.length > 0,
      );
      setProductType(hasIngredients ? "bulk" : "packaged");

      setVariants(
        product.variants.map((v: ProductVariant) => ({
          name: v.name,
          price: Number(v.price),
          stock: v.stock || 0,
          inventoryItemId: v.ingredients?.[0]?.inventoryItemId || "",
          quantityRequired: v.ingredients?.[0]?.quantityRequired || 0,
        })),
      );
    } else {
      setName("");
      setDescription("");
      setCategoryId("");
      setIsActive(true);
      setProductType("packaged");
      setVariants([
        {
          name: "",
          price: 0,
          stock: 0,
          inventoryItemId: "",
          quantityRequired: 0,
        },
      ]);
    }
  }, [product, open]);

  if (!open) return null;

  const isPending = createProduct.isPending || updateProduct.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      updateProduct.mutate(
        { id: product.id, data: { name, description, categoryId, isActive } },
        { onSuccess: onClose },
      );
    } else {
      // Construir variantes con o sin ingredientes
      const variantsPayload = variants.map((v) => {
        if (
          productType === "bulk" &&
          v.inventoryItemId &&
          v.quantityRequired > 0
        ) {
          return {
            name: v.name,
            price: v.price,
            ingredients: [
              {
                inventoryItemId: v.inventoryItemId,
                quantityRequired: v.quantityRequired,
              },
            ],
          };
        }
        return {
          name: v.name,
          price: v.price,
          stock: v.stock,
        };
      });

      createProduct.mutate(
        { name, description, categoryId, isActive, variants: variantsPayload },
        { onSuccess: onClose },
      );
    }
  };

  const addVariant = () =>
    setVariants([
      ...variants,
      {
        name: "",
        price: 0,
        stock: 0,
        inventoryItemId: "",
        quantityRequired: 0,
      },
    ]);

  const removeVariant = (idx: number) =>
    setVariants(variants.filter((_, i) => i !== idx));

  const updateVariant = (
    idx: number,
    field: keyof VariantForm,
    value: string | number,
  ) => {
    const updated = variants.map((v, i) =>
      i === idx ? { ...v, [field]: value } : v,
    );
    setVariants(updated);
  };

  // Calcular stock disponible para variantes a granel
  const getAvailableStock = (variant: VariantForm) => {
    if (
      productType !== "bulk" ||
      !variant.inventoryItemId ||
      variant.quantityRequired === 0
    )
      return null;
    const item = inventory.find((i) => i.id === variant.inventoryItemId);
    if (!item) return null;
    return Math.floor(item.currentStock / variant.quantityRequired);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Nombre del producto *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Yerba Mate Entrefina"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
              autoFocus
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none resize-none"
              placeholder="Descripción del producto..."
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Categoría *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
              required
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Producto (solo en creación) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Tipo de producto
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProductType("packaged")}
                  className={`p-3 border-2 rounded-xl text-center transition-all ${
                    productType === "packaged"
                      ? "border-yerba-600 bg-yerba-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <Package className="h-5 w-5 mx-auto mb-1 text-stone-600" />
                  <p className="text-sm font-medium text-stone-900">
                    Pre-empacado
                  </p>
                  <p className="text-xs text-stone-500">
                    Mates, bombillas, etc.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setProductType("bulk")}
                  className={`p-3 border-2 rounded-xl text-center transition-all ${
                    productType === "bulk"
                      ? "border-yerba-600 bg-yerba-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <Scale className="h-5 w-5 mx-auto mb-1 text-stone-600" />
                  <p className="text-sm font-medium text-stone-900">A granel</p>
                  <p className="text-xs text-stone-500">Yerba, hierbas...</p>
                </button>
              </div>
            </div>
          )}

          {/* Activo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-stone-300 text-yerba-600 focus:ring-yerba-500"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-stone-700"
            >
              Producto activo (visible en la tienda)
            </label>
          </div>

          {/* Variantes */}
          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-stone-700">
                  Variantes / Presentaciones *
                </label>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-yerba-600 hover:text-yerba-700 flex items-center gap-1 font-medium"
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, idx) => {
                  const availableStock = getAvailableStock(variant);
                  const selectedItem = inventory.find(
                    (i) => i.id === variant.inventoryItemId,
                  );

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-stone-50 rounded-xl space-y-3"
                    >
                      {/* Nombre de variante */}
                      <div className="flex items-center gap-2">
                        <input
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(idx, "name", e.target.value)
                          }
                          required
                          className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                          placeholder="Ej: 500g, 1kg, 2kg..."
                        />
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(idx)}
                            className="p-2 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Precio */}
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">
                          Precio de venta ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={variant.price || ""}
                          onChange={(e) =>
                            updateVariant(idx, "price", Number(e.target.value))
                          }
                          required
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                          placeholder="Ej: 3500"
                        />
                      </div>

                      {/* Campos según tipo */}
                      {productType === "bulk" ? (
                        <>
                          {/* Selector de insumo */}
                          <div>
                            <label className="text-xs text-stone-500 mb-1 block">
                              Insumo de origen *
                            </label>
                            <select
                              value={variant.inventoryItemId}
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "inventoryItemId",
                                  e.target.value,
                                )
                              }
                              required
                              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                            >
                              <option value="">Seleccionar insumo...</option>
                              {bulkItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} (
                                  {(item.currentStock / 1000).toFixed(2)} kg
                                  disponibles)
                                </option>
                              ))}
                            </select>
                            {bulkItems.length === 0 && (
                              <p className="text-xs text-amber-600 mt-1">
                                ⚠️ No hay insumos a granel. Andá a Inventario
                                primero.
                              </p>
                            )}
                          </div>

                          {/* Peso por unidad en gramos */}
                          <div>
                            <label className="text-xs text-stone-500 mb-1 block">
                              Peso por unidad (en gramos) *
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={variant.quantityRequired || ""}
                              onChange={(e) =>
                                updateVariant(
                                  idx,
                                  "quantityRequired",
                                  Number(e.target.value),
                                )
                              }
                              required
                              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                              placeholder="Ej: 500 (para 500g)"
                            />
                            {selectedItem && variant.quantityRequired > 0 && (
                              <p className="text-xs text-yerba-600 mt-1">
                                📦 Stock disponible:{" "}
                                <strong>{availableStock} unidades</strong>
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Stock fijo para pre-empacados */
                        <div>
                          <label className="text-xs text-stone-500 mb-1 block">
                            Stock inicial (unidades)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={variant.stock || ""}
                            onChange={(e) =>
                              updateVariant(
                                idx,
                                "stock",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                            placeholder="Ej: 50"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                !name.trim() ||
                !categoryId ||
                variants.some((v) => !v.name)
              }
              className="flex-1 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEditing ? "Guardar cambios" : "Crear producto"}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
