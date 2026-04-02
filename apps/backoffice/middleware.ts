import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rutas Públicas (No requieren auth)
  const publicRoutes = [
    "/login",
    "/forgot-password",
    "/api/auth", // Better Auth endpoints must be public
    "/_next", // Next.js assets
    "/favicon.ico",
  ];

  // Si es una ruta pública o asset, permitimos pasar
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    // Caso especial: Si está en login pero ya tiene cookie, mandarlo al dashboard
    if (pathname === "/login") {
      const sessionToken =
        request.cookies.get("better-auth.session_token") ||
        request.cookies.get("__Secure-better-auth.session_token");
      if (sessionToken) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Verificación de Sesión para rutas protegidas
  // Buscamos la cookie estándar de Better Auth
  const sessionToken =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionToken) {
    // Si no hay token, redirigir a login
    const loginUrl = new URL("/login", request.url);
    // loginUrl.searchParams.set("callbackUrl", pathname); // Opcional: para redirigir después
    return NextResponse.redirect(loginUrl);
  }

  // 3. Permitir acceso
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
