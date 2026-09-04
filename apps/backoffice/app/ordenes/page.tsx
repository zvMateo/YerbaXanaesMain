import { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { OrdersTable } from "@/components/orders-table";
import { OrdersSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Órdenes | Admin YerbaXanaes",
  description: "Gestión de pedidos",
};

export default function OrdersPage() {
  return (
    <AppShell>
        <div className="bg-white border-b border-stone-200 px-4 py-3 sm:px-6 md:py-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-stone-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-stone-900 font-medium">Órdenes</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 md:mt-1 md:text-2xl">
            <span className="md:hidden">Órdenes</span>
            <span className="hidden md:inline">Gestión de Órdenes</span>
          </h1>
          <p className="hidden text-stone-500 text-sm md:block">
            Administrá los pedidos de tus clientes
          </p>
        </div>

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<OrdersSkeleton />}>
            <OrdersTable />
          </Suspense>
        </div>
    </AppShell>
  );
}
