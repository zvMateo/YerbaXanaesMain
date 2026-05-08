'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-stone-800">
              Error crítico
            </h1>
            <p className="text-stone-500 text-sm">
              Ocurrió un error en la aplicación. Por favor recargá la página.
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-900 transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
