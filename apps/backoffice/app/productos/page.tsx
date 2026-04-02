import { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, QuickActions } from "@/components/sidebar";
import { ProductsManager } from "@/components/products-manager";
import { ProductsSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Productos | Admin YerbaXanaes",
  description: "Gestión de productos",
};

export default function ProductsPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-auto">
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-stone-900 font-medium">Productos</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">
            Gestión de Productos
          </h1>
          <p className="text-stone-500 text-sm">
            Creá, editá y gestioná tu catálogo completo
          </p>
        </div>

        <div className="p-6 lg:p-8">
          <Suspense fallback={<ProductsSkeleton />}>
            <ProductsManager />
          </Suspense>
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
