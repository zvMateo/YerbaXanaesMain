// 📁 apps/ecommerce/app/productos/[id]/page.tsx
// Agents-Ready: Server Component con metadata dinámica

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getProductRatings, type RatingResult } from "@/lib/api";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductDetail } from "@/components/product-detail";
import { RelatedProducts } from "@/components/related-products";
import Link from "next/link";
import { ChevronRight, Home, Star } from "lucide-react";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// Next.js 16: Generative UI - Metadata adaptativa
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Producto no encontrado | YerbaXanaes",
    };
  }

  const minPrice = Math.min(...(product.variants?.map((v) => v.price) || [0]));

  return {
    title: `${product.name} | YerbaXanaes`,
    description:
      product.description ||
      `Comprá ${product.name} al mejor precio. Envío gratis en compras mayores a $15.000.`,
    openGraph: {
      title: product.name,
      description: product.description || `Comprá ${product.name}`,
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
    // Agents-Ready: Structured data para Google
    other: {
      "json-ld": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.images,
        offers: product.variants?.map((variant) => ({
          "@type": "Offer",
          price: variant.price,
          priceCurrency: "ARS",
          availability:
            variant.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        })),
      }),
    },
  };
}

// Ratings Section Component
function RatingsSection({ data }: { data: RatingResult }) {
  if (data.totalRatings === 0) return null;

  return (
    <section className="py-8 border-t border-stone-200 mt-8">
      <h2 className="text-xl font-serif font-semibold text-stone-900 mb-2">
        Reseñas de clientes
      </h2>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= Math.round(data.avgRating)
                  ? "text-amber-400 fill-amber-400"
                  : "text-stone-300"
              }`}
            />
          ))}
        </div>
        <span className="text-2xl font-bold text-stone-900">
          {data.avgRating.toFixed(1)}
        </span>
        <span className="text-stone-500 text-sm">
          ({data.totalRatings} reseña{data.totalRatings !== 1 ? "s" : ""})
        </span>
      </div>

      <div className="space-y-4">
        {data.ratings.map((r) => (
          <div key={r.id} className="bg-stone-50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-yerba-100 rounded-full flex items-center justify-center text-yerba-700 font-semibold text-sm">
                {(r.user?.name || r.user?.email || "A")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {r.user?.name || "Cliente verificado"}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3.5 w-3.5 ${
                        star <= r.rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-stone-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="ml-auto text-xs text-stone-400">
                {new Date(r.createdAt).toLocaleDateString("es-AR")}
              </span>
            </div>
            {r.comment && (
              <p className="text-stone-700 text-sm leading-relaxed">
                "{r.comment}"
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Breadcrumb Component - Systems-Oriented: Navegación clara
function Breadcrumb({
  productName,
  categoryName,
}: {
  productName: string;
  categoryName?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex items-center gap-2 text-sm text-stone-500">
        <li>
          <Link
            href="/"
            className="hover:text-yerba-600 transition-colors flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        <ChevronRight className="h-4 w-4" />
        <li>
          <Link
            href="/productos"
            className="hover:text-yerba-600 transition-colors"
          >
            Productos
          </Link>
        </li>
        {categoryName && (
          <>
            <ChevronRight className="h-4 w-4" />
            <li className="text-stone-400">{categoryName}</li>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <li
          className="text-stone-900 font-medium truncate max-w-[200px]"
          aria-current="page"
        >
          {productName}
        </li>
      </ol>
    </nav>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  // Systems-Oriented: Fetch paralelo de producto, relacionados y reseñas
  const [product, allProducts] = await Promise.all([
    getProduct(id),
    getProducts(),
  ]);

  const ratingsData = product
    ? await getProductRatings(product.id)
    : { ratings: [], avgRating: 0, totalRatings: 0 };

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            productName={product.name}
            categoryName={product.category?.name}
          />

          {/* Product Detail - Human-Core: Experiencia inmersiva */}
          <ProductDetail product={product} />

          {/* Reseñas */}
          <RatingsSection data={ratingsData} />
        </div>

        {/* Systems-Oriented: Cross-selling inteligente */}
        <RelatedProducts currentProduct={product} products={allProducts} />
      </main>

      <Footer />
    </div>
  );
}
