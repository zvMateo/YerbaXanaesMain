import type { NextConfig } from "next";

// API_URL: URL interna del servidor NestJS
// Dev:  http://localhost:3001  (fallback automático)
// Prod: https://xxx.up.railway.app  (Railway free domain)
const API_URL = process.env.API_URL ?? "http://localhost:3001";
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Optimizado para despliegue en Railway/Docker
  output: "standalone",

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
  images: {
    // SVG solo en dev (placeholders de seed/desarrollo); deshabilitado en prod
    ...(isDev && {
      dangerouslyAllowSVG: true,
      contentDispositionType: "attachment" as const,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    }),
    remotePatterns: [
      // Localhost (desarrollo)
      {
        protocol: "http",
        hostname: "localhost",
        port: "*",
        pathname: "/**",
      },
      // Railway (producción — API domain)
      {
        protocol: "https",
        hostname: "*.up.railway.app",
        port: "",
        pathname: "/**",
      },
      // Cloudinary (imágenes de productos)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      // Placeholders y Unsplash (dev/seeds)
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
        // SVG habilitado para placeholders de desarrollo
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
