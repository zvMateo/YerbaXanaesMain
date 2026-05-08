'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Loguear en servicio de errores (Sentry, etc.) cuando esté configurado
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">
          Algo salió mal
        </h2>
        <p className="text-stone-500 text-sm">
          Ocurrió un error inesperado. Podés intentar recargar la página.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-yerba-700 text-white rounded-lg text-sm hover:bg-yerba-800 transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm hover:bg-stone-50 transition-colors"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
