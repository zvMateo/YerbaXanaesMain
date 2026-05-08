import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <Search className="h-12 w-12 text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">
          Página no encontrada
        </h2>
        <p className="text-gray-500 text-sm">
          La sección que buscás no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
