"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Category } from "@repo/types";

interface ProductFiltersProps {
  categories: Category[];
  totalProducts: number;
}

// Generative UI: Filtros adaptativos que responden a contexto
export function ProductFilters({
  categories,
  totalProducts,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Agents-Ready: Estado sincronizado con URL para shareable links
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "createdAt",
  );
  const [showFilters, setShowFilters] = useState(false);

  // Human-Core: Debounce natural para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters();
    }, 300); // 300ms delay feels organic

    return () => clearTimeout(timer);
  }, [search, selectedCategory, sortBy]);

  const updateFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);
    if (sortBy) params.set("sortBy", sortBy);

    // Systems-Oriented: URL actualizada sin refresh
    router.push(`/productos?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSortBy("createdAt");
    router.push("/productos", { scroll: false });
  };

  const hasActiveFilters = search || selectedCategory;

  return (
    <div className="bg-white border-b border-stone-200 sticky top-16 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          {/* Search - Generative: Predicción contextual */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar yerba, mates, bombillas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-full text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-yerba-500 focus:border-transparent transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-stone-400 hover:text-stone-600" />
              </button>
            )}
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            {/* Category Pills - Generative UI: Solo muestra categorías con productos */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory("")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? "bg-yerba-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Todos
              </button>
              {categories.slice(0, 4).map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.slug
                      ? "bg-yerba-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
              {categories.length > 4 && (
                <span className="text-sm text-stone-400">
                  +{categories.length - 4} más
                </span>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-stone-50 border border-stone-200 rounded-full px-4 py-2.5 pr-10 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-yerba-500 cursor-pointer"
              >
                <option value="createdAt">Más nuevos</option>
                <option value="price-asc">Precio: Menor a mayor</option>
                <option value="price-desc">Precio: Mayor a menor</option>
                <option value="name">Nombre</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2.5 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>

            {/* Clear Filters - Generative: Aparece solo cuando hay filtros */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-yerba-600 hover:text-yerba-700 font-medium"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Count - Agents-Ready: Información estructurada */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            {totalProducts === 0 ? (
              "No se encontraron productos"
            ) : (
              <>
                Mostrando{" "}
                <span className="font-medium text-stone-900">
                  {totalProducts}
                </span>{" "}
                productos
                {selectedCategory && (
                  <span>
                    {" "}
                    en{" "}
                    <span className="font-medium text-yerba-600">
                      {
                        categories.find((c) => c.slug === selectedCategory)
                          ?.name
                      }
                    </span>
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Mobile Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-stone-200 mt-4 space-y-3">
                <p className="text-sm font-medium text-stone-900">Categorías</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      !selectedCategory
                        ? "bg-yerba-600 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.slug)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category.slug
                          ? "bg-yerba-600 text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
