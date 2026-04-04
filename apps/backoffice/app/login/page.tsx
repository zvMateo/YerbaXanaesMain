"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Leaf, Lock, Eye, EyeOff, AlertCircle, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (error) {
        setError(error.message || "Error de autenticación");
        toast.error("Error de autenticación", {
          description: error.message || "Credenciales inválidas",
        });
      } else if (data) {
        router.replace("/");
      }
    } catch {
      setError("Error al iniciar sesión");
      toast.error("Error", {
        description: "Ocurrió un error al intentar iniciar sesión",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: "/",
      });

      if (error) {
        setError(error.message || "Error al iniciar sesión con Google");
        toast.error("Error de autenticación", {
          description: error.message || "No se pudo conectar con Google",
        });
      }
      // Si no hay error, Better Auth redirige automáticamente a Google
    } catch {
      setError("Error al conectar con Google");
      toast.error("Error", {
        description: "No se pudo conectar con Google. Intentá de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-yerba-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4"
            >
              <Leaf className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">YerbaXanaes</h1>
            <p className="text-yerba-100 mt-1">Panel de Administración</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-stone-900">
                Iniciar sesión
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                Accedé con tu cuenta de Google o email
              </p>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-stone-200 bg-white text-stone-700 font-medium hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {/* Google Logo SVG */}
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar con Google
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-stone-500">
                  o con email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 focus:border-yerba-500 focus:ring-yerba-100 transition-all duration-200 focus:outline-none focus:ring-4"
                    placeholder="tu@email.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`
                      w-full pl-10 pr-10 py-3 rounded-xl border-2
                      transition-all duration-200
                      focus:outline-none focus:ring-4
                      ${
                        error
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-stone-200 focus:border-yerba-500 focus:ring-yerba-100"
                      }
                    `}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mt-2 text-red-600 text-sm"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading || !email || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full py-3 rounded-xl font-semibold
                  transition-all duration-200
                  ${
                    isLoading || !email || !password
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                      : "bg-yerba-600 text-white hover:bg-yerba-700 shadow-lg hover:shadow-xl"
                  }
                `}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  "Acceder al panel"
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-stone-500 text-sm mt-6">
          © 2026 YerbaXanaes. Todos los derechos reservados.
        </p>
      </motion.div>
    </div>
  );
}

// Loader component
function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
