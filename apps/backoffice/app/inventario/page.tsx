import { Metadata } from "next";
import { Sidebar, QuickActions } from "@/components/sidebar";
import { InventoryTable } from "@/components/inventory-table";

export const metadata: Metadata = {
  title: "Inventario | Admin YerbaXanaes",
  description: "Gestión de inventario y stock",
};

export default function InventoryPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-auto">
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
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

        <div className="p-6 lg:p-8">
          <InventoryTable />
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
