'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, RefreshCw, Home } from 'lucide-react'
import { Suspense } from 'react'

function FailureContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Ícono */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          No pudimos procesar tu pago
        </h1>

        <p className="text-gray-500 mb-2">
          Tu pedido no fue completado. No se realizó ningún cobro.
        </p>

        {orderId && (
          <p className="text-sm text-gray-400 mb-6">
            Referencia:{' '}
            <span className="font-mono">{orderId.slice(0, 8)}…</span>
          </p>
        )}

        {!orderId && <div className="mb-6" />}

        {/* Posibles causas */}
        <div className="bg-red-50 rounded-xl p-4 text-left mb-8">
          <p className="text-sm font-semibold text-red-700 mb-2">
            Esto puede ocurrir por:
          </p>
          <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
            <li>Fondos insuficientes en la tarjeta</li>
            <li>Datos de la tarjeta incorrectos</li>
            <li>El banco rechazó la transacción</li>
            <li>El pago fue cancelado manualmente</li>
          </ul>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/checkout"
            className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar pago
          </Link>

          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        </div>

        {/* Ayuda */}
        <p className="text-xs text-gray-400 mt-6">
          ¿Necesitás ayuda?{' '}
          <Link href="/contacto" className="text-green-700 hover:underline">
            Contactanos
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CheckoutFailurePage() {
  return (
    <Suspense>
      <FailureContent />
    </Suspense>
  )
}
