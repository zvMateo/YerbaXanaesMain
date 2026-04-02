import { Metadata } from "next";
import { Sidebar, QuickActions } from "@/components/sidebar";
import { PaymentLinksManager } from "@/components/payment-links-manager";

export const metadata: Metadata = {
  title: "Links de Pago | Admin YerbaXanaes",
  description: "Generador de links de Mercado Pago",
};

export default function PaymentLinksPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-auto">
        {/* Breadcrumbs header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-stone-900 font-medium">Pagos</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">
            Links de Pago
          </h1>
          <p className="text-stone-500 text-sm">
            Herramientas para venta social (WhatsApp, Instagram)
          </p>
        </div>

        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <PaymentLinksManager />
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
