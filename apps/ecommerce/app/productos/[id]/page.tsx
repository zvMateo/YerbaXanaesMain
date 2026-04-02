// 📁 apps/ecommerce/app/productos/[id]/page.tsx
// Agents-Ready: Server Component con metadata dinámica

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/api";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductDetail } from "@/components/product-detail";
import { RelatedProducts } from "@/components/related-products";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

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

  // Systems-Oriented: Fetch paralelo de producto y relacionados
  const [product, allProducts] = await Promise.all([
    getProduct(id),
    getProducts(),
  ]);

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
        </div>

        {/* Systems-Oriented: Cross-selling inteligente */}
        <RelatedProducts currentProduct={product} products={allProducts} />
      </main>

      <Footer />
    </div>
  );
}
