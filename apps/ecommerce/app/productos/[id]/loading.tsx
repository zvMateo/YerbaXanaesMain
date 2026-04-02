import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductDetailSkeleton } from "@/components/skeletons";

export default function ProductLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 py-4">
            <div className="w-4 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-4 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-20 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-4 h-4 bg-stone-200 rounded animate-pulse" />
            <div className="w-32 h-4 bg-stone-200 rounded animate-pulse" />
          </div>

          <ProductDetailSkeleton />
        </div>

        {/* Related products skeleton */}
        <div className="bg-white py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-8 bg-stone-200 rounded animate-pulse w-48 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] bg-stone-200 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
