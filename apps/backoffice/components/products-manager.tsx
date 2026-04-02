"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ImageIcon,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useProducts,
  useDeleteProduct,
  type Product,
} from "@/hooks/use-products";
import { ProductFormModal } from "./product-form-modal";

// Componente principal
export function ProductsManager() {
  const { data: products, isLoading, error } = useProducts();
  const deleteProduct = useDeleteProduct();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const openCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description &&
          product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || product.category?.name === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.isActive) ||
        (statusFilter === "inactive" && !product.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set(products.map((p) => p.category?.name).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  // Eliminar producto
  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      deleteProduct.mutate(id);
    }
  };

  // Calcular stock total
  const getTotalStock = (product: Product) => {
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  };

  // Obtener precio base (el menor de las variantes)
  const getBasePrice = (product: Product) => {
    if (product.variants.length === 0) return 0;
    return Math.min(...product.variants.map((v) => Number(v.price)));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-stone-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl">
        Error al cargar productos: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editingProduct}
      />
      {/* Header y filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-stone-200 rounded-xl bg-white text-sm"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat as string} value={cat as string}>
                  {cat as string}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-stone-200 rounded-xl bg-white text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>

            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-yerba-600 text-white rounded-xl hover:bg-yerba-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-stone-200 text-sm">
          <span className="text-stone-600">
            <strong className="text-stone-900">
              {filteredProducts.length}
            </strong>{" "}
            productos
          </span>
          <span className="text-stone-600">
            <strong className="text-stone-900">
              {filteredProducts.filter((p) => getTotalStock(p) < 10).length}
            </strong>{" "}
            con stock bajo
          </span>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="space-y-3">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-2xl border transition-all ${
              product.isActive
                ? "border-stone-200"
                : "border-stone-200 opacity-60"
            }`}
          >
            {/* Header del producto */}
            <div
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-stone-50 transition-colors"
              onClick={() =>
                setExpandedProduct(
                  expandedProduct === product.id ? null : product.id,
                )
              }
            >
              {/* Imagen placeholder */}
              <div className="w-16 h-16 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-stone-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-900 truncate">
                    {product.name}
                  </h3>
                  {!product.isActive && (
                    <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-xs rounded-full">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-500 truncate">
                  {product.category?.name || "Sin categoría"}
                </p>
              </div>

              {/* Stock */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-stone-900">
                  {getTotalStock(product)} unidades
                </p>
                {getTotalStock(product) < 10 && (
                  <p className="text-xs text-red-600 flex items-center gap-1 justify-end">
                    <AlertTriangle className="h-3 w-3" />
                    Stock bajo
                  </p>
                )}
              </div>

              {/* Precio */}
              <div className="text-right">
                <p className="font-semibold text-stone-900">
                  ${getBasePrice(product).toLocaleString("es-AR")}
                </p>
                <p className="text-xs text-stone-500">
                  {product.variants.length} variantes
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(product);
                  }}
                  className="p-2 text-stone-400 hover:text-yerba-600 hover:bg-yerba-50 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product.id);
                  }}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {expandedProduct === product.id ? (
                  <ChevronUp className="h-5 w-5 text-stone-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-stone-400" />
                )}
              </div>
            </div>

            {/* Detalles expandidos */}
            <AnimatePresence>
              {expandedProduct === product.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-stone-200 overflow-hidden"
                >
                  <div className="p-4 bg-stone-50">
                    <p className="text-sm text-stone-600 mb-4">
                      {product.description || "Sin descripción"}
                    </p>

                    <h4 className="text-sm font-semibold text-stone-900 mb-2">
                      Variantes:
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className={`p-3 bg-white rounded-xl border ${
                            variant.stock < 5
                              ? "border-red-200"
                              : "border-stone-200"
                          }`}
                        >
                          <p className="font-medium text-stone-900">
                            {variant.name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-semibold">
                              ${Number(variant.price).toLocaleString("es-AR")}
                            </span>
                            <span
                              className={`text-xs ${
                                variant.stock < 5
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {variant.stock} uds
                            </span>
                          </div>
                          {variant.isVirtualStock && (
                            <p className="text-[10px] text-stone-400 mt-1">
                              Stock calculado (Receta)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <Package className="h-12 w-12 text-stone-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900">
            No se encontraron productos
          </h3>
          <p className="text-stone-500 mt-1">
            Probá con otros filtros o creá uno nuevo
          </p>
        </div>
      )}
    </div>
  );
}
