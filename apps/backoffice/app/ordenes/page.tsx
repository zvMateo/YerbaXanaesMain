import { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, QuickActions } from "@/components/sidebar";
import { OrdersTable } from "@/components/orders-table";
import { OrdersSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Órdenes | Admin YerbaXanaes",
  description: "Gestión de pedidos",
};

export default function OrdersPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-auto">
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-stone-900 font-medium">Órdenes</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mt-1">
              Gestión de Órdenes
            </h1>
            <p className="text-stone-500 text-sm">
              Administrá los pedidos de tus clientes
            </p>
          </div>

        </div>

        <div className="p-6 lg:p-8">
          <Suspense fallback={<OrdersSkeleton />}>
            <OrdersTable />
          </Suspense>
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
