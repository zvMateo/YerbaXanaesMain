import { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, QuickActions } from "@/components/sidebar";
import { DashboardContent } from "@/components/dashboard-content";
import { DashboardSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Dashboard | Admin YerbaXanaes",
  description: "Panel de control de ventas y métricas",
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-auto">
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span className="text-stone-900 font-medium">Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">
            Resumen General
          </h1>
          <p className="text-stone-500 text-sm">
            Visualizá el estado de tu negocio en tiempo real
          </p>
        </div>

        <div className="p-6 lg:p-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
          </Suspense>
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
