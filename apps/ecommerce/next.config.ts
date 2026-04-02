import type { NextConfig } from "next";

// API_URL: URL interna del servidor NestJS
// Dev:  http://localhost:3001  (fallback automático)
// Prod: https://xxx.up.railway.app  (Railway free domain)
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
  images: {
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
