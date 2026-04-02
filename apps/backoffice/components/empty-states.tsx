"use client";

import { motion } from "motion/react";
import {
  Package,
  ShoppingCart,
  Users,
  Search,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Plus,
} from "lucide-react";
import Link from "next/link";

// ============================================
// EMPTY STATES
// ============================================

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
  href?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Package,
  action,
  href,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-500 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-6 py-3 bg-yerba-600 text-white rounded-xl font-medium hover:bg-yerba-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          {action.label}
        </button>
      )}
      {href && (
        <Link
          href={href}
          className="flex items-center gap-2 px-6 py-3 bg-yerba-600 text-white rounded-xl font-medium hover:bg-yerba-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          {title.includes("producto") ? "Crear producto" : "Crear orden"}
        </Link>
      )}
    </motion.div>
  );
}

export function NoProductsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No hay productos"
      description="Tu catálogo está vacío. Comenzá agregando tu primer producto para empezar a vender."
      action={{ label: "Crear producto", onClick: onCreate }}
    />
  );
}

export function NoOrdersEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No hay órdenes"
      description="Aún no recibiste ningún pedido. Las órdenes aparecerán aquí cuando los clientes compren."
      action={
        onCreate
          ? { label: "Crear orden manual", onClick: onCreate }
          : undefined
      }
    />
  );
}

export function NoCustomersEmpty() {
  return (
    <EmptyState
      icon={Users}
      title="No hay clientes"
      description="Aún no tenés clientes registrados. Los clientes aparecerán aquí cuando hagan su primera compra."
    />
  );
}

export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">
        No se encontraron resultados
      </h3>
      <p className="text-stone-500 mb-2">
        No hay coincidencias para "
        <span className="font-medium text-stone-700">{query}</span>"
      </p>
      <p className="text-stone-400 text-sm mb-6">
        Probá con otros términos o verificá la ortografía
      </p>
      <button
        onClick={onClear}
        className="text-yerba-600 hover:text-yerba-700 font-medium hover:underline"
      >
        Limpiar búsqueda
      </button>
    </motion.div>
  );
}

// ============================================
// ERROR STATES
// ============================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorState({
  title = "Algo salió mal",
  message = "Hubo un error al cargar los datos. Por favor, intentá de nuevo.",
  onRetry,
  onBack,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-500 max-w-sm mb-6">{message}</p>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-yerba-600 text-white rounded-xl font-medium hover:bg-yerba-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Intentar de nuevo
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ApiErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Error de conexión"
      message="No pudimos conectar con el servidor. Verificá tu conexión a internet e intentá de nuevo."
      onRetry={onRetry}
    />
  );
}

export function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <ErrorState
      title="Página no encontrada"
      message="La página que buscás no existe o fue movida."
      onBack={onBack}
    />
  );
}

// ============================================
// SKELETON LOADING STATES
// ============================================

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${sizeClasses[size]} border-4 border-stone-200 border-t-yerba-600 rounded-full`}
      />
    </div>
  );
}

export function InlineLoading({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-stone-500">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-4 h-4 border-2 border-stone-300 border-t-yerba-600 rounded-full"
      />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ============================================
// SUCCESS STATES
// ============================================

export function SuccessState({
  title,
  message,
  onContinue,
}: {
  title: string;
  message: string;
  onContinue?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
      >
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>
      <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
      <p className="text-stone-500 max-w-sm mb-6">{message}</p>
      {onContinue && (
        <button
          onClick={onContinue}
          className="px-6 py-3 bg-yerba-600 text-white rounded-xl font-medium hover:bg-yerba-700 transition-colors"
        >
          Continuar
        </button>
      )}
    </motion.div>
  );
}
