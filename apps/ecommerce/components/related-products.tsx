import { Product } from "@repo/types";
import { ProductCard } from "./product-card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RelatedProductsProps {
  currentProduct: Product;
  products: Product[];
}

// Systems-Oriented: Cross-selling inteligente
export function RelatedProducts({
  currentProduct,
  products,
}: RelatedProductsProps) {
  // Generative UI: Filtrar productos relacionados por categoría
  const related = products
    .filter(
      (p) =>
        p.id !== currentProduct.id &&
        p.categoryId === currentProduct.categoryId &&
        p.isActive,
    )
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="py-16 border-t border-stone-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-900">
              También te puede interesar
            </h2>
            <p className="text-stone-600 mt-2">
              Productos similares a {currentProduct.name}
            </p>
          </div>
          <Link
            href={`/productos?category=${currentProduct.category?.slug}`}
            className="hidden md:inline-flex items-center gap-2 text-yerba-600 font-semibold hover:text-yerba-700 transition-colors"
          >
            Ver más {currentProduct.category?.name}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {related.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/productos?category=${currentProduct.category?.slug}`}
            className="inline-flex items-center gap-2 text-yerba-600 font-semibold hover:text-yerba-700 transition-colors"
          >
            Ver más {currentProduct.category?.name}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
