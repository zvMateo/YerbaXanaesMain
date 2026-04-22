import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Footer } from "@/components/footer";
import { NewsletterCta } from "@/components/newsletter-cta";
import { getProducts, getCategories } from "@/lib/api";
import type { Product, Category } from "@repo/types";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Package,
  Truck,
  Shield,
  Leaf,
  Coffee,
  Star,
  Blend,
  ShoppingBag,
} from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yerbaxanaes.com";

// --- Structured Data ---
function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "YerbaXanaes",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
        },
        description:
          "Yerba mate premium, mates artesanales y accesorios. Calidad argentina directo a tu puerta.",
        address: {
          "@type": "PostalAddress",
          addressCountry: "AR",
        },
        sameAs: [
          "https://www.instagram.com/yerbaxanaes",
          "https://www.facebook.com/yerbaxanaes",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "YerbaXanaes",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/productos?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// --- Category icons map ---
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  yerbas: Leaf,
  yerba: Leaf,
  mates: Coffee,
  mate: Coffee,
  bombillas: Blend,
  bombilla: Blend,
  accesorios: Package,
  accesorio: Package,
  combos: ShoppingBag,
  combo: ShoppingBag,
};

function getCategoryIcon(slug: string): React.ElementType {
  const key = Object.keys(CATEGORY_ICON_MAP).find((k) =>
    slug.toLowerCase().includes(k),
  );
  return key ? CATEGORY_ICON_MAP[key] : Package;
}

function isKnownBrokenImage(url: string): boolean {
  return url.includes("photo-1596449080386-9762d0c76e7f");
}

function isUnsplashImage(url: string): boolean {
  return url.includes("images.unsplash.com");
}

// --- Featured Products ---
function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-2">
              Lo más elegido
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
              Productos Destacados
            </h2>
            <p className="text-stone-600 max-w-xl">
              Descubrí nuestra selección de productos más populares, elegidos
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
          {products.map((product, index) => {
            const firstVariant = product.variants?.[0];
            const price = firstVariant ? Number(firstVariant.price) : 0;
            const isPriority = index < 2;
            const imageUrl = product.images[0];
            const shouldRenderImage =
              Boolean(imageUrl) && !isKnownBrokenImage(imageUrl);

            return (
              <Link
                key={product.id}
                href={`/productos/${product.slug}`}
                className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl hover:border-yerba-200 transition-all duration-300 cursor-pointer"
              >
                <div className="aspect-square bg-stone-100 relative overflow-hidden">
                  {shouldRenderImage ? (
                    <Image
                      src={imageUrl}
                      alt={`${product.name} — YerbaXanaes`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      priority={isPriority}
                      unoptimized={isUnsplashImage(imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-yerba-50 to-earth-50">
                      <Leaf className="h-16 w-16 text-yerba-300" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {product.category && (
                    <p className="text-xs text-yerba-600 font-semibold uppercase tracking-wider mb-1">
                      {product.category.name}
                    </p>
                  )}
                  <h3 className="font-semibold text-stone-900 mb-1 line-clamp-1">
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
                    <span className="bg-stone-100 group-hover:bg-yerba-600 group-hover:text-white text-stone-700 p-3 rounded-full transition-colors duration-200">
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

// --- Benefits ---
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
          <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-2">
            Por qué elegirnos
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            Calidad que se siente en cada sorbo
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
              <p className="text-stone-600 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Testimonios ---
const TESTIMONIALS = [
  {
    name: "Martina G.",
    city: "Buenos Aires",
    initials: "MG",
    rating: 5,
    text: "La yerba es de una calidad impresionante. Llegó súper bien envasada y el sabor es increíble. Ya pedí por tercera vez y siempre llega rápido.",
  },
  {
    name: "Diego F.",
    city: "Córdoba",
    initials: "DF",
    rating: 5,
    text: "Compré el combo de yerba + mate artesanal y quedé muy conforme. El mate es hermoso y la yerba tiene un sabor muy auténtico. ¡100% recomendable!",
  },
  {
    name: "Carla R.",
    city: "Rosario",
    initials: "CR",
    rating: 5,
    text: "Excelente atención y producto de primera. Muy buena relación calidad-precio. Se nota que hay dedicación en cada pedido. ¡Gracias YerbaXanaes!",
  },
];

function Testimonials() {
  return (
    <section className="py-20 bg-stone-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-2">
            Lo que dicen nuestros clientes
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            Miles de mates felices
          </h2>
          <p className="text-stone-600 max-w-xl mx-auto">
            La opinión de quienes ya probaron la diferencia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-stone-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-earth-500 fill-earth-500"
                  />
                ))}
              </div>
              <p className="text-stone-700 text-sm leading-relaxed mb-6 italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yerba-100 flex items-center justify-center shrink-0">
                  <span className="text-yerba-700 font-bold text-sm">
                    {t.initials}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">
                    {t.name}
                  </p>
                  <p className="text-stone-500 text-xs">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Categories ---
function CategoriesSection({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-yerba-600 font-semibold text-sm uppercase tracking-wider mb-2">
            Nuestros productos
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            Explorá por Categoría
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Encontrá todo lo que necesitás para tu ritual del mate
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            const productCount = category._count?.products ?? 0;

            return (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-stone-50 border border-stone-200 aspect-square flex flex-col items-center justify-center hover:bg-yerba-50 hover:border-yerba-200 transition-all duration-300 cursor-pointer p-6 text-center"
              >
                <div className="w-16 h-16 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:bg-yerba-100 transition-colors">
                  <Icon className="h-8 w-8 text-yerba-600" />
                </div>
                <h3 className="font-semibold text-stone-900 text-base">
                  {category.name}
                </h3>
                {productCount > 0 && (
                  <p className="text-sm text-stone-500 mt-1">
                    {productCount} producto{productCount !== 1 ? "s" : ""}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --- Main Page ---
export default async function Home() {
  const [allProducts, categories] = await Promise.all([
    getProducts({ inStock: true }),
    getCategories(),
  ]);
  const featuredByFlag = allProducts.filter((p) => p.isFeatured);
  const featured =
    featuredByFlag.length > 0
      ? featuredByFlag.slice(0, 4)
      : allProducts.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <OrganizationSchema />
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturedProducts products={featured} />
        <Benefits />
        <Testimonials />
        <CategoriesSection categories={categories} />
        <NewsletterCta />
      </main>
      <Footer />
    </div>
  );
}
