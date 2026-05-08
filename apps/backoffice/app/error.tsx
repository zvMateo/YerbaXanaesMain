'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[BackofficeErrorBoundary]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">
          Algo salió mal
        </h2>
        <p className="text-gray-500 text-sm">
          Ocurrió un error inesperado en el panel de administración.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Ir al dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
