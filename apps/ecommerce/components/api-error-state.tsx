"use client";

import { AlertCircle, Server } from "lucide-react";
import Link from "next/link";

export function ApiErrorState() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-100 rounded-full mb-6">
          <Server className="h-10 w-10 text-stone-600" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">
          Servicio temporalmente no disponible
        </h2>
        <p className="text-stone-600 mb-8">
          No pudimos conectar con nuestro servidor. Por favor, intentá
          nuevamente en unos momentos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-yerba-700 transition-colors"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-stone-100 text-stone-700 px-6 py-3 rounded-full font-semibold hover:bg-stone-200 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-stone-50 rounded-lg text-left">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-stone-400 mt-0.5" />
            <div className="text-sm text-stone-500">
              <p className="font-medium text-stone-700 mb-1">
                Información técnica:
              </p>
              <p>
                API URL:{" "}
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}
              </p>
              <p className="mt-2">
                Asegurate de que el servidor esté corriendo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
