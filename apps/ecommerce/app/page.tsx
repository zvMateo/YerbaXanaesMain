import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { OriginStrip } from "@/components/origin-strip";
import { Footer } from "@/components/footer";
import { RevealItem, SectionReveal } from "@/components/section-reveal";
import { getProducts, getCategories } from "@/lib/api";
import { brand } from "@/lib/brand";
import type { Product, Category } from "@repo/types";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Package,
  Truck,
  MapPin,
  Leaf,
  Coffee,
  Blend,
  ShoppingBag,
} from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yerbaxanaes.com";

// --- Structured Data ---
function OrganizationSchema() {
  const sameAs = [brand.social.instagram, brand.social.facebook].filter(
    (u): u is string => Boolean(u),
  );

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: brand.businessName,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/brand/logo.png`,
        },
        description:
          "Yerba mate premium, mates artesanales y accesorios. Calidad argentina directo a tu puerta.",
        email: brand.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: brand.city,
          addressRegion: brand.region,
          addressCountry: "AR",
        },
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: brand.businessName,
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
      // Escapamos "<" para que ningún valor (incl. data dinámica futura) pueda
      // cerrar el <script> ni inyectar markup. Patrón recomendado por Next.js.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
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
  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal variant="rise" className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10 md:mb-12">
          <div>
            <p className="text-palm font-semibold text-sm uppercase tracking-wider mb-2">
              Lo más elegido
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-shadow mb-4">
              Productos Destacados
            </h2>
            <p className="text-shadow/70 max-w-xl">
              Nuestra selección de yerbas y accesorios listos para tu mate
            </p>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-2 text-palm font-semibold hover:text-shadow transition-colors"
          >
            Ver todos
            <ArrowRight className="h-5 w-5" />
          </Link>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {products.map((product, index) => {
            const firstVariant = product.variants?.[0];
            const price = firstVariant ? Number(firstVariant.price) : 0;
            const isPriority = index < 2;
            const imageUrl = product.images[0];
            const shouldRenderImage =
              Boolean(imageUrl) && !isKnownBrokenImage(imageUrl);

            return (
              <RevealItem
                key={product.id}
                index={index}
                variant="rise"
                className="h-full"
              >
                <Link
                  href={`/productos/${product.slug}`}
                  className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-palm/40 transition-all duration-300 cursor-pointer h-full block"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {shouldRenderImage ? (
                      <Image
                        src={imageUrl}
                        alt={`${product.name} — YerbaXanaes`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        priority={isPriority}
                        unoptimized={isUnsplashImage(imageUrl)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Leaf className="h-16 w-16 text-leaf" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5">
                    {product.category && (
                      <p className="text-xs text-palm font-semibold uppercase tracking-wider mb-1">
                        {product.category.name}
                      </p>
                    )}
                    <h3 className="font-semibold text-shadow mb-1 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-shadow/60 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-serif text-2xl font-bold text-palm">
                          ${price.toLocaleString("es-AR")}
                        </span>
                        {firstVariant && (
                          <span className="text-sm text-shadow/50 ml-1">
                            /{firstVariant.name}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex h-11 w-11 items-center justify-center bg-terra text-shadow rounded-full transition-colors duration-200 group-hover:bg-terra/90">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/productos"
            className="inline-flex min-h-11 items-center gap-2 text-palm font-semibold hover:text-shadow transition-colors"
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
  const freeShip = `$${brand.freeShippingFromArs.toLocaleString("es-AR")}`;
  const benefits = [
    {
      icon: Leaf,
      title: "100% Natural",
      description:
        "Sin conservantes. Yerba mate seleccionada, como ya lo decimos en la tienda.",
      href: "/nosotros",
    },
    {
      icon: Truck,
      title: "Envío a todo el país",
      description:
        "Cotizamos con Correo Argentino en el checkout. Si no hay tarifa, coordinamos por WhatsApp.",
      href: "/envios",
    },
    {
      icon: MapPin,
      title: "Retiro en origen",
      description: `Retiro en ${brand.locationLabel}.`,
      href: "/envios",
    },
    {
      icon: Package,
      title: "Envío gratis",
      description: `En compras desde ${freeShip}. Se confirma en el checkout.`,
      href: "/envios",
    },
  ];

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal variant="soft" className="text-center mb-16">
          <p className="text-palm font-semibold text-sm uppercase tracking-wider mb-2">
            Por qué elegirnos
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-shadow mb-4">
            Calidad que se siente en cada sorbo
          </h2>
          <p className="text-shadow/70 max-w-2xl mx-auto">
            Nos apasiona el mate y eso se nota en cada detalle. Desde la
            selección de productos hasta tu puerta.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <RevealItem
              key={benefit.title}
              index={index}
              variant="soft"
              className="text-center h-full"
            >
              <Link
                href={benefit.href}
                className="block h-full rounded-xl p-2 -m-2 hover:bg-card/60 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-card border border-border mb-6">
                  <benefit.icon className="h-8 w-8 text-palm" />
                </div>
                <h3 className="font-semibold text-shadow text-lg mb-2">
                  {benefit.title}
                </h3>
                <p className="text-shadow/70 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </Link>
            </RevealItem>
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
    <section className="py-20 bg-cream">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionReveal variant="slide" className="text-center mb-12">
          <p className="text-palm font-semibold text-sm uppercase tracking-wider mb-2">
            Nuestros productos
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-shadow mb-4">
            Explorá por Categoría
          </h2>
          <p className="text-shadow/70 max-w-2xl mx-auto">
            Encontrá todo lo que necesitás para tu ritual del mate
          </p>
        </SectionReveal>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => {
            const Icon = getCategoryIcon(category.slug);
            const productCount = category._count?.products ?? 0;

            return (
              <RevealItem
                key={category.id}
                index={index}
                variant="slide"
                className="h-full"
              >
                <Link
                  href={`/productos?category=${category.slug}`}
                  className="group relative overflow-hidden bg-card border border-border aspect-square flex flex-col items-center justify-center hover:bg-muted hover:border-palm/40 transition-all duration-300 cursor-pointer p-6 text-center h-full"
                >
                  <div className="w-16 h-16 bg-cream border border-border flex items-center justify-center mb-4 group-hover:border-palm/40 transition-colors">
                    <Icon className="h-8 w-8 text-palm" />
                  </div>
                  <h3 className="font-semibold text-shadow text-base">
                    {category.name}
                  </h3>
                  {productCount > 0 && (
                    <p className="text-sm text-shadow/60 mt-1">
                      {productCount} producto{productCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </Link>
              </RevealItem>
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
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <OrganizationSchema />
      <Header />
      <main className="flex-1">
        <Hero />
        <OriginStrip />
        <FeaturedProducts products={featured} />
        <Benefits />
        <CategoriesSection categories={categories} />
      </main>
      <Footer />
    </div>
  );
}
