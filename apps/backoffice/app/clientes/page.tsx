import { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { CustomersManager } from "@/components/customers-manager";
import { CustomersSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Clientes | Admin YerbaXanaes",
  description: "Gestión de clientes",
};

export default function CustomersPage() {
  return (
    <AppShell>
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-4 py-4 sm:px-6">
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

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<CustomersSkeleton />}>
            <CustomersManager />
          </Suspense>
        </div>
    </AppShell>
  );
}
