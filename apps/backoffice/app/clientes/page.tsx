import { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, QuickActions } from "@/components/sidebar";
import { CustomersManager } from "@/components/customers-manager";
import { CustomersSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Clientes | Admin YerbaXanaes",
  description: "Gestión de clientes",
};

export default function CustomersPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-auto">
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-stone-900 font-medium">Clientes</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">
            Gestión de Clientes
          </h1>
          <p className="text-stone-500 text-sm">
            Conocé a tus clientes y fidelizalos
          </p>
        </div>

        <div className="p-6 lg:p-8">
          <Suspense fallback={<CustomersSkeleton />}>
            <CustomersManager />
          </Suspense>
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
