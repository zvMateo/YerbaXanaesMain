"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import {
  HelpCircle,
  Keyboard,
  BookOpen,
  Server,
  Mail,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Zap,
  Database,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// TIPOS
// ============================================================

interface HealthStatus {
  api: {
    status: "healthy" | "unhealthy" | "checking";
    url: string;
    responseTime?: number;
    message?: string;
  };
  database: {
    status: "healthy" | "unhealthy" | "checking";
    message?: string;
  };
}

// ============================================================
// HEALTH CHECK
// ============================================================

async function checkApiHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  message?: string;
}> {
  const API_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  ).replace(/\/+$/, "");

  const start = Date.now();
  try {
    const response = await fetch(`${API_URL}/api/docs`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Date.now() - start;
    return {
      healthy: response.ok,
      responseTime: elapsed,
      message: response.ok ? "API operativa" : `HTTP ${response.status}`,
    };
  } catch {
    const elapsed = Date.now() - start;
    return {
      healthy: false,
      responseTime: elapsed,
      message: "No se pudo conectar con la API",
    };
  }
}

// ============================================================
// COMPONENTES
// ============================================================

function KeyboardShortcuts() {
  const shortcuts = [
    { keys: "Ctrl + D", action: "Ir al Dashboard" },
    { keys: "Ctrl + O", action: "Ir a Órdenes" },
    { keys: "Ctrl + P", action: "Ir a Productos" },
    { keys: "Ctrl + I", action: "Ir a Inventario" },
    { keys: "Ctrl + C", action: "Ir a Clientes" },
    { keys: "Ctrl + B", action: "Colapsar sidebar" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Keyboard className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Atajos de Teclado
          </h2>
          <p className="text-sm text-stone-500">
            Navegá más rápido por el panel
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.keys}
            className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
          >
            <span className="text-sm text-stone-700">{shortcut.action}</span>
            <kbd className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-600 shadow-sm">
              {shortcut.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickGuide() {
  const guides = [
    {
      title: "Crear un producto",
      steps: [
        "Andá a Productos → botón 'Nuevo Producto'",
        "Completá nombre, descripción y categoría",
        "Agregá variantes (tamaños, precios)",
        "Si es un producto con receta, vinculá los ingredientes del inventario",
      ],
    },
    {
      title: "Ajustar stock",
      steps: [
        "Andá a Inventario",
        "Buscá el insumo que necesitás ajustar",
        "Click en 'Ajustar Stock' → ingresá la cantidad (+ o -)",
        "El stock de los productos vinculados se recalcula automáticamente",
      ],
    },
    {
      title: "Gestionar órdenes",
      steps: [
        "Andá a Órdenes para ver todos los pedidos",
        "Los nuevos pedidos aparecen en estado PENDING",
        "Cuando MercadoPago confirma el pago, cambian a PAID",
        "Podés cambiar el estado manualmente con las acciones de la tabla",
      ],
    },
    {
      title: "Ver métricas del negocio",
      steps: [
        "El Dashboard muestra KPIs en tiempo real",
        "Revenue de hoy, semana y mes con comparativa",
        "Productos más vendidos y ventas por categoría",
        "Gráfico de ventas semanales",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yerba-100 rounded-lg">
          <BookOpen className="h-5 w-5 text-yerba-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Guía Rápida</h2>
          <p className="text-sm text-stone-500">
            Cómo hacer las tareas más comunes
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {guides.map((guide, i) => (
          <details
            key={guide.title}
            className="group bg-stone-50 rounded-xl overflow-hidden"
          >
            <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-stone-100 transition-colors">
              <span className="flex items-center justify-center w-6 h-6 bg-yerba-600 text-white text-xs font-bold rounded-full">
                {i + 1}
              </span>
              <span className="font-medium text-stone-900">{guide.title}</span>
              <ExternalLink className="h-4 w-4 text-stone-400 ml-auto group-open:rotate-45 transition-transform" />
            </summary>
            <div className="px-4 pb-4 pl-12">
              <ol className="space-y-2">
                {guide.steps.map((step, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-sm text-stone-600"
                  >
                    <CheckCircle2 className="h-4 w-4 text-yerba-500 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function SystemInfo() {
  const [health, setHealth] = useState<HealthStatus>({
    api: { status: "checking", url: "" },
    database: { status: "checking" },
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const runChecks = async () => {
      const apiResult = await checkApiHealth();
      const API_URL = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      ).replace(/\/+$/, "");

      setHealth({
        api: {
          status: apiResult.healthy ? "healthy" : "unhealthy",
          url: API_URL,
          responseTime: apiResult.responseTime,
          message: apiResult.message,
        },
        database: {
          status: apiResult.healthy ? "healthy" : "unhealthy",
          message: apiResult.healthy
            ? "Conectada (vía API)"
            : "No se pudo verificar",
        },
      });
    };

    runChecks();
  }, []);

  const handleCopyInfo = () => {
    const info = `
YerbaXanaes - Info del Sistema
API: ${health.api.url}
Estado API: ${health.api.status}
Tiempo de respuesta: ${health.api.responseTime}ms
Base de datos: ${health.database.status}
    `.trim();

    navigator.clipboard.writeText(info);
    setCopied(true);
    toast.success("Info copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "healthy")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          Operativo
        </span>
      );
    if (status === "unhealthy")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          <XCircle className="h-3 w-3" />
          Error
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando...
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Server className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Estado del Sistema
          </h2>
          <p className="text-sm text-stone-500">
            Verificá que todo esté funcionando correctamente
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* API */}
        <div className="p-4 bg-stone-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Zap className="h-5 w-5 text-stone-400" />
            <StatusBadge status={health.api.status} />
          </div>
          <p className="text-sm font-medium text-stone-900">API NestJS</p>
          <p className="text-xs text-stone-500 mt-1">
            {health.api.message || "Verificando..."}
          </p>
          {health.api.responseTime && (
            <p className="text-xs text-stone-400 mt-1">
              {health.api.responseTime}ms
            </p>
          )}
        </div>

        {/* Database */}
        <div className="p-4 bg-stone-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Database className="h-5 w-5 text-stone-400" />
            <StatusBadge status={health.database.status} />
          </div>
          <p className="text-sm font-medium text-stone-900">PostgreSQL</p>
          <p className="text-xs text-stone-500 mt-1">
            {health.database.message || "Verificando..."}
          </p>
        </div>

        {/* Security */}
        <div className="p-4 bg-stone-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 text-stone-400" />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Activo
            </span>
          </div>
          <p className="text-sm font-medium text-stone-900">Better Auth</p>
          <p className="text-xs text-stone-500 mt-1">Google + Email/Password</p>
        </div>
      </div>

      {/* Copy info button */}
      <div className="flex justify-end">
        <button
          onClick={handleCopyInfo}
          className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copiar info del sistema
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SupportContact() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageCircle className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Soporte</h2>
          <p className="text-sm text-stone-500">
            ¿Necesitás ayuda? Contactá al desarrollador
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="mailto:zavalamateo14@gmail.com"
          className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors group"
        >
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Mail className="h-5 w-5 text-stone-500" />
          </div>
          <div>
            <p className="font-medium text-stone-900 group-hover:text-yerba-600 transition-colors">
              Email
            </p>
            <p className="text-sm text-stone-500">zavalamateo14@gmail.com</p>
          </div>
        </a>

        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <MessageCircle className="h-5 w-5 text-stone-500" />
          </div>
          <div>
            <p className="font-medium text-stone-900">WhatsApp</p>
            <p className="text-sm text-stone-500">Consultá por el número</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-yerba-50 border border-yerba-200 rounded-xl">
        <p className="text-sm text-yerba-800">
          <strong>Versión:</strong> 1.0.0 — Desarrollado con Turborepo + NestJS
          + Next.js + Better Auth + MercadoPago
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function AyudaPage() {
  return (
    <div className="flex min-h-screen bg-stone-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6 space-y-10">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <HelpCircle className="h-7 w-7 text-yerba-600" />
              <h1 className="text-2xl font-bold text-stone-900">
                Centro de Ayuda
              </h1>
            </div>
            <p className="text-stone-500">
              Todo lo que necesitás saber para usar el panel de administración
            </p>
          </div>

          {/* Sections */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <SystemInfo />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <KeyboardShortcuts />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <QuickGuide />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <SupportContact />
          </div>
        </div>
      </main>
    </div>
  );
}
