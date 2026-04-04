"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from "@/hooks/use-products";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  X,
  Check,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

// ============================================================
// MODAL DE CREAR/EDITAR CATEGORÍA
// ============================================================

function CategoryModal({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEditing = !!category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (isEditing && category) {
      updateCategory.mutate(
        { id: category.id, data: { name: name.trim() } },
        { onSuccess: onClose },
      );
    } else {
      createCategory.mutate({ name: name.trim() }, { onSuccess: onClose });
    }
  };

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">
            {isEditing ? "Editar categoría" : "Nueva categoría"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Nombre de la categoría
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Yerbas, Mates, Bombillas..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all focus:outline-none"
              autoFocus
              required
            />
            <p className="text-xs text-stone-500 mt-1">
              El slug se genera automáticamente
            </p>
          </div>

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
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEditing ? "Actualizar" : "Crear"}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function CategoriasPage() {
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [modalCategory, setModalCategory] = useState<
    Category | null | undefined
  >(undefined);

  const handleDelete = (category: Category) => {
    if (category._count?.products && category._count.products > 0) {
      toast.error("No se puede eliminar", {
        description: `La categoría tiene ${category._count.products} producto(s). Mové o eliminá los productos primero.`,
      });
      return;
    }
    toast.custom(
      (t) => (
        <div className="bg-white rounded-xl shadow-lg border border-stone-200 p-4 max-w-sm">
          <p className="font-medium text-stone-900 mb-1">
            ¿Eliminar categoría?
          </p>
          <p className="text-sm text-stone-500 mb-3">
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                deleteCategory.mutate(category.id, {
                  onSuccess: () => toast.dismiss(t),
                });
              }}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Categorías</h1>
              <p className="text-stone-500 mt-1">
                Organizá tus productos por categorías
              </p>
            </div>
            <button
              onClick={() => setModalCategory(null)}
              className="flex items-center gap-2 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              Nueva categoría
            </button>
          </div>

          {/* Lista de categorías */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-stone-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yerba-100 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-yerba-600" />
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{cat.name}</p>
                        <p className="text-xs text-stone-500">/{cat.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm text-stone-500">
                        <Package className="h-4 w-4" />
                        {cat._count?.products || 0} producto
                        {cat._count?.products !== 1 ? "s" : ""}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModalCategory(cat)}
                          className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-700"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-stone-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FolderOpen className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">
                  No hay categorías todavía
                </p>
                <p className="text-sm text-stone-400 mt-1">
                  Creá tu primera categoría para organizar los productos
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {modalCategory !== undefined && (
          <CategoryModal
            category={modalCategory || undefined}
            onClose={() => setModalCategory(undefined)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
