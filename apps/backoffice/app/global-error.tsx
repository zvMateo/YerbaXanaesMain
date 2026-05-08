'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[BackofficeGlobalErrorBoundary]', error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-gray-800">
              Error crítico
            </h1>
            <p className="text-gray-500 text-sm">
              Ocurrió un error en el panel de administración. Por favor recargá la página.
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
