import { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | YerbaXanaes",
  description: "Completa tu compra de yerba mate premium",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-900">
              Finalizar Compra
            </h1>
            <p className="text-stone-600 mt-2">
              Completá tus datos para procesar el pedido
            </p>
          </div>

          <CheckoutForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
