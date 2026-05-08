import { Metadata } from "next";
import { Sidebar, QuickActions } from "@/components/sidebar";

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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">Módulo pausado</h2>
            <p className="mt-2 text-sm leading-6">
              La pantalla de links de pago queda desactivada temporalmente
              porque el API todavía no expone los endpoints de
              <code className="mx-1 rounded bg-amber-100 px-1 py-0.5">
                /payment-links
              </code>
              . Esto evita mostrar una funcionalidad rota en el backoffice.
            </p>
          </div>
        </div>
      </main>

      <QuickActions />
    </div>
  );
}
