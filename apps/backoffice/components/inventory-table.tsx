"use client";

import { useMemo, useState } from "react";
import { useInventory, type InventoryItem } from "@/hooks/use-inventory";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AdjustStockModal } from "./adjust-stock-modal";

// SKELETON
export function InventorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-full bg-stone-100 rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 w-full bg-stone-50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

// EMPTY STATE
function EmptyState({ title, description, icon: Icon }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-stone-50 p-4 rounded-full mb-4">
        <Icon className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-medium text-stone-900">{title}</h3>
      <p className="text-stone-500 mt-1 max-w-sm">{description}</p>
    </div>
  );
}

// MAIN COMPONENT
export function InventoryTable() {
  const { data: inventory, isLoading, error } = useInventory();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "ok">("all");
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  const filteredData = useMemo(() => {
    if (!inventory) return [];

    return inventory.filter((item) => {
      // Text Search
      const matchesSearch =
        item.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (item.sku &&
          item.sku.toLowerCase().includes(globalFilter.toLowerCase()));

      // Stock Status Filter
      let matchesStock = true;
      if (stockFilter === "low") {
        matchesStock =
          item.minStockAlert !== null &&
          item.currentStock <= item.minStockAlert;
      } else if (stockFilter === "ok") {
        matchesStock =
          item.minStockAlert === null || item.currentStock > item.minStockAlert;
      }

      return matchesSearch && matchesStock;
    });
  }, [inventory, globalFilter, stockFilter]);

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Insumo / Producto",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-stone-900">{row.original.name}</p>
          {row.original.sku && (
            <p className="text-xs text-stone-500 font-mono">
              SKU: {row.original.sku}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "currentStock",
      header: "Stock Actual",
      cell: ({ row }) => {
        const item = row.original;
        const isLow =
          item.minStockAlert !== null &&
          item.currentStock <= item.minStockAlert;

        // Format Unit
        const unitLabel = item.unit === "GRAMS" ? "g" : "u";
        const val =
          item.unit === "GRAMS"
            ? (item.currentStock / 1000).toFixed(2) + " kg" // Show KG for grams
            : item.currentStock + " u";

        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${isLow ? "text-red-600" : "text-stone-900"}`}
            >
              {val}
            </span>
            {isLow && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                Bajo
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "minStockAlert",
      header: "Alerta Mínima",
      cell: ({ row }) => {
        const val = row.original.minStockAlert;
        if (val === null) return <span className="text-stone-400">-</span>;

        const unitLabel = row.original.unit === "GRAMS" ? "kg" : "u";
        const displayVal = row.original.unit === "GRAMS" ? val / 1000 : val;

        return (
          <span className="text-stone-600">
            {displayVal} {unitLabel}
          </span>
        );
      },
    },
    {
      accessorKey: "costPrice",
      header: "Costo Unit.",
      cell: ({ row }) => (
        <span className="text-stone-600">
          {row.original.costPrice
            ? `$${Number(row.original.costPrice).toLocaleString("es-AR")}`
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Última act.",
      cell: ({ row }) => (
        <span className="text-xs text-stone-500">
          {new Date(row.original.updatedAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <button
          onClick={() => setAdjustItem(row.original)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yerba-700 bg-yerba-50 hover:bg-yerba-100 rounded-lg transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Ajustar
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (isLoading) return <InventorySkeleton />;

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700">
        Error al cargar inventario: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdjustStockModal
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-stone-400" />
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-yerba-500 bg-white"
          >
            <option value="all">Todos</option>
            <option value="low">Stock Bajo</option>
            <option value="ok">Stock OK</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <EmptyState
            title="No hay insumos"
            description="No se encontraron items que coincidan con tu búsqueda."
            icon={Package}
          />
        )}

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-between">
          <span className="text-sm text-stone-600">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
