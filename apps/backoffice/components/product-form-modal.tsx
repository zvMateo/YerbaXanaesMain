"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
  type Product,
} from "@/hooks/use-products";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export function ProductFormModal({
  open,
  onClose,
  product,
}: ProductFormModalProps) {
  const isEditing = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useCategories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState([{ name: "", price: 0, stock: 0 }]);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setCategoryId(product.categoryId);
      setIsActive(product.isActive);
    } else {
      setName("");
      setDescription("");
      setCategoryId("");
      setIsActive(true);
      setVariants([{ name: "", price: 0, stock: 0 }]);
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
      createProduct.mutate(
        { name, description, categoryId, isActive, variants },
        { onSuccess: onClose },
      );
    }
  };

  const addVariant = () =>
    setVariants([...variants, { name: "", price: 0, stock: 0 }]);

  const removeVariant = (idx: number) =>
    setVariants(variants.filter((_, i) => i !== idx));

  const updateVariant = (
    idx: number,
    field: keyof (typeof variants)[0],
    value: string | number,
  ) => {
    const updated = variants.map((v, i) =>
      i === idx ? { ...v, [field]: value } : v,
    );
    setVariants(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-xl font-semibold text-stone-900">
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Nombre *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
              placeholder="Ej: Yerba Mate Premium"
            />
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent resize-none"
              placeholder="Descripcion del producto..."
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Categoria *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl bg-white focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
            >
              <option value="">Seleccionar categoria...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

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

          {/* Variantes — solo en modo creacion */}
          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-stone-700">
                  Variantes *
                </label>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-yerba-600 hover:text-yerba-700 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Agregar variante
                </button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={variant.name}
                        onChange={(e) => updateVariant(idx, "name", e.target.value)}
                        required
                        className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500"
                        placeholder="Nombre de variante (ej: 500g)"
                      />
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="p-2 text-red-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">
                          Precio $
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={variant.price}
                          onChange={(e) =>
                            updateVariant(idx, "price", Number(e.target.value))
                          }
                          required
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">
                          Stock
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(idx, "stock", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-1 focus:ring-yerba-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {isPending
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
