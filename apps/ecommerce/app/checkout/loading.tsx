import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckoutSkeleton } from "@/components/skeletons";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header del Checkout */}
          <div className="text-center mb-8">
            <div className="h-10 bg-stone-200 rounded animate-pulse w-64 mx-auto" />
            <div className="h-5 bg-stone-200 rounded animate-pulse w-96 mx-auto mt-2" />
          </div>

          <CheckoutSkeleton />
        </div>
      </main>

      <Footer />
    </div>
  );
}
