"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  MoreVertical,
  EyeOff,
  Eye,
  ShoppingCart,
  X,
} from "lucide-react";
import {
  useProducts,
  useDeleteProduct,
  useToggleProductStatus,
  type Product,
} from "@/hooks/use-products";
import { ProductFormModal } from "./product-form-modal";

// -------------------------------------------------------
// MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
// -------------------------------------------------------

interface DeleteConfirmModalProps {
  product: Product;
  hasOrders: boolean;
  onConfirmDelete: () => void;
  onDeactivate: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  isDeactivating: boolean;
}

function DeleteConfirmModal({
  product,
  hasOrders,
  onConfirmDelete,
  onDeactivate,
  onCancel,
  isDeleting,
  isDeactivating,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                hasOrders ? "bg-amber-100" : "bg-red-100"
              }`}
            >
              {hasOrders ? (
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              ) : (
                <Trash2 className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                {hasOrders ? "Producto con órdenes" : "Eliminar producto"}
              </h2>
              <p className="text-sm text-stone-500 mt-0.5 truncate max-w-[240px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {hasOrders ? (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  Este producto tiene órdenes de compra asociadas y{" "}
                  <strong>no puede eliminarse</strong>. Para que deje de
                  aparecer en la tienda, desactivalo.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onDeactivate}
                  disabled={isDeactivating || !product.isActive}
                  className="w-full py-2.5 bg-stone-800 text-white rounded-xl hover:bg-stone-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeactivating
                    ? "Desactivando..."
                    : !product.isActive
                      ? "Ya está inactivo"
                      : "Desactivar producto"}
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-2.5 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                Esta acción es permanente. Se eliminarán el producto, sus
                variantes e imágenes. Los datos de órdenes anteriores no se
                verán afectados.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// -------------------------------------------------------
// DROPDOWN DE ACCIONES
// -------------------------------------------------------

interface ActionDropdownProps {
  product: Product;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isTogglingStatus: boolean;
}

function ActionDropdown({
  product,
  onEdit,
  onToggleStatus,
  onDelete,
  isTogglingStatus,
}: ActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        title="Más acciones"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-stone-200 z-20 overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Edit className="h-4 w-4 text-stone-500" />
              Editar producto
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onToggleStatus();
              }}
              disabled={isTogglingStatus}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {product.isActive ? (
                <>
                  <EyeOff className="h-4 w-4 text-stone-500" />
                  Desactivar
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-stone-500" />
                  Activar
                </>
              )}
            </button>

            <div className="border-t border-stone-100 my-0.5" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------
// COMPONENTE PRINCIPAL
// -------------------------------------------------------

export function ProductsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { data: products, isLoading, error } = useProducts();
  const deleteProduct = useDeleteProduct();
  const toggleStatus = useToggleProductStatus();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Modal State via URL Query Params
  const action = searchParams.get("action");
  const productId = searchParams.get("id");

  const modalOpen = action === "new" || action === "edit";

  const editingProduct = useMemo(() => {
    if (action === "edit" && productId && products) {
      return products.find((p) => p.id === productId) || null;
    }
    return null;
  }, [action, productId, products]);

  const openCreate = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "new");
    params.delete("id");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openEdit = (product: Product) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "edit");
    params.set("id", product.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.delete("id");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
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

  // ¿El producto tiene órdenes asociadas?
  const productHasOrders = (product: Product) =>
    product.variants.some((v) => (v._count?.orderItems ?? 0) > 0);

  // Calcular stock total
  const getTotalStock = (product: Product) => {
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  };

  // Obtener precio base (el menor de las variantes)
  const getBasePrice = (product: Product) => {
    if (product.variants.length === 0) return 0;
    return Math.min(...product.variants.map((v) => Number(v.price)));
  };

  // Handlers
  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    deleteProduct.mutate(productToDelete.id, {
      onSuccess: () => setProductToDelete(null),
      onError: () => setProductToDelete(null),
    });
  };

  const handleDeactivate = (product: Product) => {
    toggleStatus.mutate(
      { id: product.id, isActive: false },
      { onSuccess: () => setProductToDelete(null) },
    );
  };

  const handleToggleStatus = (product: Product) => {
    toggleStatus.mutate({ id: product.id, isActive: !product.isActive });
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
        onClose={closeModal}
        product={editingProduct}
      />

      {/* Modal de confirmación de eliminación */}
      <AnimatePresence>
        {productToDelete && (
          <DeleteConfirmModal
            product={productToDelete}
            hasOrders={productHasOrders(productToDelete)}
            onConfirmDelete={handleConfirmDelete}
            onDeactivate={() => handleDeactivate(productToDelete)}
            onCancel={() => setProductToDelete(null)}
            isDeleting={deleteProduct.isPending}
            isDeactivating={toggleStatus.isPending}
          />
        )}
      </AnimatePresence>

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
              {filteredProducts.filter((p) => p.isActive).length}
            </strong>{" "}
            activos
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
        {filteredProducts.map((product, index) => {
          const hasOrders = productHasOrders(product);
          const totalStock = getTotalStock(product);

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl border transition-all ${
                product.isActive ? "border-stone-200" : "border-stone-200 opacity-60"
              }`}
            >
              {/* Header del producto */}
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-stone-50 transition-colors rounded-2xl"
                onClick={() =>
                  setExpandedProduct(
                    expandedProduct === product.id ? null : product.id,
                  )
                }
              >
                {/* Imagen */}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-900 truncate">
                      {product.name}
                    </h3>
                    {/* Badge de estado — clickeable para toggle rápido */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(product);
                      }}
                      disabled={toggleStatus.isPending}
                      title={
                        product.isActive
                          ? "Clic para desactivar"
                          : "Clic para activar"
                      }
                      className={`px-2 py-0.5 text-xs rounded-full font-medium transition-all flex items-center gap-1 disabled:opacity-50 ${
                        product.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                      }`}
                    >
                      {product.isActive ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Activo
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Inactivo
                        </>
                      )}
                    </button>
                    {/* Badge de órdenes */}
                    {hasOrders && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        Con órdenes
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
                    {totalStock} unidades
                  </p>
                  {totalStock < 10 && (
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
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionDropdown
                    product={product}
                    onEdit={() => openEdit(product)}
                    onToggleStatus={() => handleToggleStatus(product)}
                    onDelete={() => handleDelete(product)}
                    isTogglingStatus={toggleStatus.isPending}
                  />
                  {expandedProduct === product.id ? (
                    <ChevronUp
                      className="h-5 w-5 text-stone-400 cursor-pointer"
                      onClick={() => setExpandedProduct(null)}
                    />
                  ) : (
                    <ChevronDown
                      className="h-5 w-5 text-stone-400 cursor-pointer"
                      onClick={() => setExpandedProduct(product.id)}
                    />
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
                    <div className="p-4 bg-stone-50 rounded-b-2xl">
                      <p className="text-sm text-stone-600 mb-4">
                        {product.description || "Sin descripción"}
                      </p>

                      <h4 className="text-sm font-semibold text-stone-900 mb-2">
                        Variantes:
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {product.variants.map((variant) => {
                          const variantHasOrders =
                            (variant._count?.orderItems ?? 0) > 0;
                          return (
                            <div
                              key={variant.id}
                              className={`p-3 bg-white rounded-xl border ${
                                variant.stock < 5
                                  ? "border-red-200"
                                  : "border-stone-200"
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-stone-900 text-sm truncate flex-1">
                                  {variant.name}
                                </p>
                                {variantHasOrders && (
                                  <ShoppingCart
                                    className="h-3 w-3 text-blue-500 flex-shrink-0"
                                    title="Tiene órdenes asociadas"
                                  />
                                )}
                              </div>
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
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
