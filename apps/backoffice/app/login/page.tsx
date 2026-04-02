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
        callbackURL: "/", // Redirect after login
      });

      if (error) {
        setError(error.message || "Error de autenticación");
        toast.error("Error de autenticación", {
          description: error.message || "Credenciales inválidas",
        });
      } else if (data) {
        console.log("Login exitoso, redirigiendo...", data);
        // Redirigir inmediatamente sin toast
        router.replace("/");
      }
    } catch (err) {
      setError("Error al iniciar sesión");
      toast.error("Error", {
        description: "Ocurrió un error al intentar iniciar sesión",
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
                Ingresá tus credenciales de administrador
              </p>
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
                    placeholder="admin@yerbaxanaes.com"
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

            {/* Hint */}
            <div className="mt-6 p-4 bg-stone-50 rounded-lg text-xs text-stone-500">
              <p className="font-medium text-stone-700 mb-1">Demo:</p>
              <p>
                Email:{" "}
                <code className="bg-stone-200 px-1 rounded">
                  admin@yerbaxanaes.com
                </code>
              </p>
              <p>
                Contraseña:{" "}
                <code className="bg-stone-200 px-1 rounded">admin123</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-stone-500 text-sm mt-6">
          © 2024 YerbaXanaes. Todos los derechos reservados.
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
