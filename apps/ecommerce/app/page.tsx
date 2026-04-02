import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Footer } from "@/components/footer";
import { getProducts } from "@/lib/api";
import type { Product } from "@repo/types";
import Link from "next/link";
import { ArrowRight, Package, Truck, Shield, Leaf } from "lucide-react";

// Featured Products Section Component
function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
              Productos Destacados
            </h2>
            <p className="text-stone-600 max-w-xl">
              Descubre nuestra selección de productos más populares, elegidos
              por nuestros clientes
            </p>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-2 text-yerba-600 font-semibold hover:text-yerba-700 transition-colors"
          >
            Ver todos
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const firstVariant = product.variants?.[0];
            const price = firstVariant ? Number(firstVariant.price) : 0;

            return (
              <Link
                key={product.id}
                href={`/productos/${product.slug}`}
                className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Image */}
                <div className="aspect-square bg-stone-100 flex items-center justify-center relative overflow-hidden">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-6xl">🧉</span>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-semibold text-stone-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-stone-500 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif text-2xl font-bold text-yerba-600">
                        ${price.toLocaleString("es-AR")}
                      </span>
                      {firstVariant && (
                        <span className="text-sm text-stone-400 ml-1">
                          /{firstVariant.name}
                        </span>
                      )}
                    </div>
                    <span className="bg-stone-100 group-hover:bg-yerba-600 group-hover:text-white text-stone-700 p-3 rounded-full transition-colors">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-yerba-600 font-semibold hover:text-yerba-700 transition-colors"
          >
            Ver todos los productos
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Benefits Section Component
function Benefits() {
  const benefits = [
    {
      icon: Leaf,
      title: "100% Natural",
      description:
        "Productos seleccionados de la más alta calidad, sin aditivos ni conservantes.",
    },
    {
      icon: Truck,
      title: "Envío Rápido",
      description:
        "Entregamos en 24-48hs a todo el país. Gratis en compras mayores a $15.000.",
    },
    {
      icon: Shield,
      title: "Garantía de Calidad",
      description:
        "Si no estás satisfecho, te devolvemos tu dinero. Sin preguntas.",
    },
    {
      icon: Package,
      title: "Packaging Premium",
      description:
        "Envases diseñados para mantener la frescura y calidad del producto.",
    },
  ];

  return (
    <section className="py-20 bg-yerba-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            ¿Por qué elegir YerbaXanaes?
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Nos apasiona el mate y eso se nota en cada detalle. Desde la
            selección de productos hasta tu puerta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md mb-6">
                <benefit.icon className="h-8 w-8 text-yerba-600" />
              </div>
              <h3 className="font-semibold text-stone-900 text-lg mb-2">
                {benefit.title}
              </h3>
              <p className="text-stone-600 text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Categories Section Component
function Categories() {
  const categories = [
    { name: "Yerbas", count: 12, emoji: "🌿" },
    { name: "Mates", count: 8, emoji: "🧉" },
    { name: "Bombillas", count: 6, emoji: "🥤" },
    { name: "Accesorios", count: 15, emoji: "🎒" },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            Explora por Categoría
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Encuentra todo lo que necesitas para tu ritual del mate
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/productos?categoria=${category.name.toLowerCase()}`}
              className="group relative overflow-hidden rounded-2xl bg-stone-100 aspect-square flex flex-col items-center justify-center hover:bg-yerba-100 transition-colors"
            >
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {category.emoji}
              </span>
              <h3 className="font-semibold text-stone-900 text-lg">
                {category.name}
              </h3>
              <p className="text-sm text-stone-500">
                {category.count} productos
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Main Page Component
export default async function Home() {
  const allProducts = await getProducts({ inStock: true });
  const featured = allProducts.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturedProducts products={featured} />
        <Benefits />
        <Categories />
      </main>
      <Footer />
    </div>
  );
}
