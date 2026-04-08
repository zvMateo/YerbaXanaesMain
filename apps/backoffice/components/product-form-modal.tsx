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

import { ImageUploader } from "./image-uploader";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onProductCreated?: (product: Product) => void;
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
  onProductCreated,
}: ProductFormModalProps) {
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  // Use createdProduct if we just created one, otherwise use passed product
  const activeProduct = createdProduct || product;
  const isEditing = !!activeProduct;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useCategories();
  const { data: inventory = [] } = useInventory();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [productType, setProductType] = useState<ProductType>("packaged");
  const [variants, setVariants] = useState<VariantForm[]>([
    { name: "", price: 0, stock: 0, inventoryItemId: "", quantityRequired: 0 },
  ]);

  const [images, setImages] = useState<string[]>([]);

  // Filtrar solo insumos a granel (GRAMS)
  const bulkItems = inventory.filter((item) => item.unit === "GRAMS");

  useEffect(() => {
    if (activeProduct) {
      setName(activeProduct.name);
      setDescription(activeProduct.description || "");
      setCategoryId(activeProduct.categoryId);
      setIsActive(activeProduct.isActive);
      setIsFeatured(activeProduct.isFeatured ?? false);

      // Detectar tipo: si tiene ingredientes es "a granel"
      const hasIngredients = activeProduct.variants.some(
        (v: ProductVariant) => v.ingredients && v.ingredients.length > 0,
      );
      setProductType(hasIngredients ? "bulk" : "packaged");
      setImages(activeProduct.images || []);

      setVariants(
        activeProduct.variants.map((v: ProductVariant) => ({
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
      setIsFeatured(false);
      setProductType("packaged");
      setImages([]);
      setVariants([
        {
          name: "",
          price: 0,
          stock: 0,
          inventoryItemId: "",
          quantityRequired: 0,
        },
      ]);
      setCreatedProduct(null);
    }
  }, [activeProduct, open]);

  if (!open) return null;

  const isPending = createProduct.isPending || updateProduct.isPending;

  const buildVariantsPayload = () =>
    variants.map((v) => {
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
      return { name: v.name, price: v.price, stock: v.stock };
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const variantsPayload = buildVariantsPayload();

    if (isEditing && activeProduct) {
      updateProduct.mutate(
        {
          id: activeProduct.id,
          data: {
            name,
            description,
            categoryId,
            isActive,
            isFeatured,
            variants: variantsPayload,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createProduct.mutate(
        {
          name,
          description,
          categoryId,
          isActive,
          isFeatured,
          variants: variantsPayload,
        },
        {
          onSuccess: (newProduct) => {
            setCreatedProduct(newProduct);
            if (onProductCreated) {
              onProductCreated(newProduct);
            }
            // No cerramos el modal, lo dejamos en modo edición
          },
        },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 shrink-0">
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col overflow-hidden min-h-0"
        >
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Columna Izquierda: Info Básica */}
              <div className="space-y-4">
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
                    rows={4}
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

                {/* Activo + Destacado */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-yerba-600 focus:ring-yerba-500 cursor-pointer"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-sm font-medium text-stone-700 cursor-pointer"
                    >
                      Producto activo (visible en la tienda)
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-yerba-600 focus:ring-yerba-500 cursor-pointer"
                    />
                    <label
                      htmlFor="isFeatured"
                      className="text-sm font-medium text-stone-700 cursor-pointer"
                    >
                      Destacado en la homepage
                    </label>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Variantes e Imágenes */}
              <div className="space-y-6">
                {/* Tipo de Producto */}
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
                      <p className="text-sm font-medium text-stone-900">
                        A granel
                      </p>
                      <p className="text-xs text-stone-500">
                        Yerba, hierbas...
                      </p>
                    </button>
                  </div>
                </div>

                {/* Variantes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-stone-700">
                      Variantes / Presentaciones *
                    </label>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="text-xs px-2 py-1 bg-yerba-50 text-yerba-700 hover:bg-yerba-100 rounded-md flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {variants.map((variant, idx) => {
                      const availableStock = getAvailableStock(variant);
                      const selectedItem = inventory.find(
                        (i) => i.id === variant.inventoryItemId,
                      );

                      return (
                        <div
                          key={idx}
                          className="p-4 bg-stone-50 rounded-xl space-y-3 border border-stone-200/60 relative group"
                        >
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="absolute top-2 right-2 p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Nombre y Precio */}
                          <div className="grid grid-cols-2 gap-3 pr-8">
                            <div>
                              <label className="text-xs text-stone-500 mb-1 block">
                                Nombre *
                              </label>
                              <input
                                value={variant.name}
                                onChange={(e) =>
                                  updateVariant(idx, "name", e.target.value)
                                }
                                required
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                                placeholder="Ej: 500g, 1kg..."
                              />
                            </div>
                            <div>
                              <label className="text-xs text-stone-500 mb-1 block">
                                Precio de venta ($) *
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={variant.price || ""}
                                onChange={(e) =>
                                  updateVariant(
                                    idx,
                                    "price",
                                    Number(e.target.value),
                                  )
                                }
                                required
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500 focus:outline-none"
                                placeholder="Ej: 3500"
                              />
                            </div>
                          </div>

                          {/* Campos según tipo */}
                          {productType === "bulk" ? (
                            <div className="grid grid-cols-2 gap-3">
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
                                  <option value="">Seleccionar...</option>
                                  {bulkItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} (
                                      {(item.currentStock / 1000).toFixed(2)}{" "}
                                      kg)
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Peso por unidad */}
                              <div>
                                <label className="text-xs text-stone-500 mb-1 block">
                                  Peso ud. (gramos) *
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
                                  placeholder="Ej: 500"
                                />
                              </div>
                            </div>
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

                          {/* Info de stock calculado (solo granel) */}
                          {productType === "bulk" &&
                            selectedItem &&
                            variant.quantityRequired > 0 && (
                              <div className="pt-2 border-t border-stone-200/60">
                                <p className="text-xs text-yerba-700 font-medium">
                                  📦 Stock calculado: {availableStock} unidades
                                  disponibles
                                </p>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Inferior de Imágenes (Abarca todo el ancho) */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              {isEditing && activeProduct ? (
                <div>
                  {createdProduct && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-green-900">
                          ¡Producto guardado exitosamente!
                        </h4>
                        <p className="text-sm text-green-700 mt-0.5">
                          Ya podés subir las imágenes para este producto o
                          cerrar si terminaste.
                        </p>
                      </div>
                    </div>
                  )}
                  <ImageUploader
                    productId={activeProduct.id}
                    images={images}
                    onUploadSuccess={(url) => setImages([...images, url])}
                    onDeleteSuccess={(url) =>
                      setImages(images.filter((i) => i !== url))
                    }
                  />
                </div>
              ) : (
                <div className="p-6 bg-yerba-50 border border-yerba-100 rounded-xl flex items-center justify-center text-center">
                  <p className="text-sm text-yerba-800">
                    💡 Podrás subir imágenes de inmediato una vez que crees el
                    producto.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Fijo con Acciones */}
          <div className="p-6 border-t border-stone-200 bg-stone-50 shrink-0 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-100 transition-colors font-medium shadow-sm"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                !name.trim() ||
                !categoryId ||
                variants.some((v) => !v.name)
              }
              className="px-8 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
