import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export function StaticPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-yerba-50 via-white to-earth-50 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
              {title}
            </h1>
            {description && (
              <p className="text-lg text-stone-600">{description}</p>
            )}
          </div>
        </section>
        <section className="py-14 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl prose prose-stone prose-headings:font-serif">
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
