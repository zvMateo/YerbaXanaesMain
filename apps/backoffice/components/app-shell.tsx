"use client";

import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    // El contenedor NO lleva overflow-x-hidden: cualquier overflow distinto de
    // visible en un ancestro rompe el `sticky` del Sidebar, que entonces
    // scrollea con la pagina en vez de quedar fijo. El desborde horizontal lo
    // contiene el <main>, que no es ancestro del aside.
    <div className="flex min-h-dvh flex-col bg-stone-50/50 lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
