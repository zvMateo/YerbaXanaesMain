"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-yerba-50 via-white to-earth-50 py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 bg-yerba-100 text-yerba-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Yerba Mate Premium Argentina</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-tight mb-6">
              Descubre el auténtico
              <span className="text-yerba-600"> sabor argentino</span>
            </h1>

            <p className="text-lg text-stone-600 mb-8 max-w-xl mx-auto lg:mx-0">
              Seleccionamos las mejores yerbas mate, mates artesanales y
              accesorios para que disfrutes de la tradición en cada sorbo.
              Calidad que se siente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/productos"
                className="inline-flex items-center justify-center gap-2 bg-yerba-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-yerba-700 transition-colors"
              >
                Ver Productos
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/nosotros"
                className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 border-2 border-stone-200 px-8 py-4 rounded-full font-semibold hover:border-yerba-600 hover:text-yerba-600 transition-colors"
              >
                Conocenos
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-stone-200 pt-8">
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  100%
                </div>
                <div className="text-sm text-stone-600">Natural</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  500+
                </div>
                <div className="text-sm text-stone-600">Clientes</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-bold text-yerba-600">
                  24h
                </div>
                <div className="text-sm text-stone-600">Envío</div>
              </div>
            </div>
          </motion.div>

          {/* Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-yerba-100 to-earth-100 flex items-center justify-center relative overflow-hidden">
              {/* Placeholder for product image */}
              <div className="text-center p-8">
                <div className="w-48 h-48 mx-auto mb-4 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <span className="text-6xl">🧉</span>
                </div>
                <p className="text-stone-500 text-sm">
                  Imagen de producto destacado
                </p>
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute top-8 left-8 bg-white rounded-xl p-4 shadow-lg"
              >
                <div className="text-2xl font-bold text-yerba-600">$4.500</div>
                <div className="text-sm text-stone-600">Yerba Premium 1kg</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="absolute bottom-8 right-8 bg-yerba-600 text-white rounded-xl p-4 shadow-lg"
              >
                <div className="text-sm font-medium">Stock disponible</div>
                <div className="text-xs opacity-90">Envío gratis</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
