"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role: "USER" | "ADMIN";
    image?: string;
  } | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const isAuthenticated = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    // Redirect to login if not authenticated (except on login page)
    if (!isPending && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
      return;
    }

    // Solo admins pueden acceder al backoffice.
    // Si un usuario USER (no admin) llegó hasta acá lo deslogueamos.
    // Con el allowlist en auth.ts esto no debería pasar en prod, pero es defensivo.
    if (!isPending && isAuthenticated && !isAdmin && pathname !== "/login") {
      void (async () => {
        await signOut();
        router.push("/login");
      })();
    }
  }, [isPending, isAuthenticated, isAdmin, pathname, router]);

  const logout = async () => {
    await signOut();
    router.push("/login");
  };

  // Better Auth devuelve role como `string` genérico.
  // Lo casteamos al union type que define nuestro contexto.
  const typedUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? undefined,
        role: (session.user.role as "USER" | "ADMIN") ?? "USER",
        image: session.user.image ?? undefined,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: isPending,
        user: typedUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
