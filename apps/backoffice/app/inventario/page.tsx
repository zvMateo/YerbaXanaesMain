import { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { InventoryTable } from "@/components/inventory-table";

export const metadata: Metadata = {
  title: "Inventario | Admin YerbaXanaes",
  description: "Gestión de inventario y stock",
};

export default function InventoryPage() {
  return (
    <AppShell>
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-stone-900 font-medium">Inventario</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">
            Gestión de Inventario
          </h1>
          <p className="text-stone-500 text-sm">
            Control de stock de materia prima e insumos
          </p>
        </div>

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <InventoryTable />
        </div>
    </AppShell>
  );
}
