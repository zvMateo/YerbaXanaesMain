"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail } from "lucide-react";

export function NewsletterCta() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setEmail("");
      toast.success("¡Te sumaste a la comunidad!", {
        description: "Te avisamos cuando tengamos novedades y promociones.",
      });
    }, 800);
  }

  return (
    <section className="py-20 bg-gradient-to-br from-yerba-600 to-yerba-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-6">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
            Unite a la comunidad matera
          </h2>
          <p className="text-yerba-100 text-lg mb-8">
            Enterate primero de nuevas yerbas, promociones exclusivas y consejos
            para preparar el mate perfecto.
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email"
              required
              className="flex-1 px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-yerba-200 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-white text-yerba-700 font-semibold px-7 py-3 rounded-full hover:bg-yerba-50 transition-colors disabled:opacity-70 cursor-pointer"
            >
              {loading ? "Enviando..." : "Suscribirme"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
          <p className="text-yerba-300 text-xs mt-4">
            Sin spam. Podés darte de baja cuando quieras.
          </p>
        </div>
      </div>
    </section>
  );
}
