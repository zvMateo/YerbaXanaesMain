import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductFilters } from "@/components/product-filters";
import { ProductGrid } from "@/components/product-grid";
import { ApiErrorState } from "@/components/api-error-state";
import {
  ProductGridSkeleton,
  ProductFiltersSkeleton,
} from "@/components/skeletons";
import { getProducts, getCategories, checkApiHealth } from "@/lib/api";

interface ProductosPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sortBy?: string;
  }>;
}

// Systems-Oriented: Wrapper que maneja errores
async function ProductContent({
  category,
  search,
  sortBy,
}: {
  category?: string;
  search?: string;
  sortBy?: string;
}) {
  // Verificar salud de la API primero
  const isHealthy = await checkApiHealth();

  if (!isHealthy) {
    return <ApiErrorState />;
  }

  // Systems-Oriented: Fetch paralelo de datos
  const [products, categories] = await Promise.all([
    getProducts({
      category,
      search,
      sortBy,
      order:
        sortBy?.includes("price") && sortBy.includes("desc") ? "desc" : "asc",
    }),
    getCategories(),
  ]);

  return (
    <>
      {/* Generative UI: Filtros adaptativos */}
      <Suspense fallback={<ProductFiltersSkeleton />}>
        <ProductFilters
          categories={categories}
          totalProducts={products.length}
        />
      </Suspense>

      {/* Products Grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductGrid products={products} />
      </div>
    </>
  );
}

// Next.js 16: Server Component con async/await
export default async function ProductosPage({
  searchParams,
}: ProductosPageProps) {
  // Agents-Ready: Parámetros tipados y estructurados
  const params = await searchParams;
  const { category, search, sortBy } = params;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-stone-50">
        {/* Page Header */}
        <div className="bg-white border-b border-stone-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-900">
              Nuestros Productos
            </h1>
            <p className="text-stone-600 mt-2">
              Descubre nuestra selección de yerba mate, mates artesanales y
              accesorios premium
            </p>
          </div>
        </div>

        {/* Content with error handling */}
        <Suspense
          fallback={
            <>
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  <aside className="w-full lg:w-64 flex-shrink-0">
                    <ProductFiltersSkeleton />
                  </aside>
                  <div className="flex-1">
                    <ProductGridSkeleton count={8} />
                  </div>
                </div>
              </div>
            </>
          }
        >
          <ProductContent category={category} search={search} sortBy={sortBy} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

// Next.js 16: Metadata dinámica para SEO (Agents-Ready)
export async function generateMetadata({ searchParams }: ProductosPageProps) {
  const params = await searchParams;
  const { category, search } = params;

  if (search) {
    return {
      title: `Búsqueda: ${search} | YerbaXanaes`,
      description: `Resultados de búsqueda para "${search}" en YerbaXanaes`,
    };
  }

  if (category) {
    return {
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} | YerbaXanaes`,
      description: `Explora nuestra selección de ${category} premium`,
    };
  }

  return {
    title: "Productos | YerbaXanaes",
    description:
      "Descubre nuestra selección de yerba mate, mates artesanales y accesorios premium",
  };
}
