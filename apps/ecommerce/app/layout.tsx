import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./global.css";
import { Providers } from "@/components/providers";

// Fuente principal - Sans-serif moderna
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Fuente títulos - Serif elegante
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yerbaxanaes.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "YerbaXanaes | Yerba Mate Premium Argentina",
    template: "%s | YerbaXanaes",
  },
  description:
    "Yerba mate premium, mates artesanales y accesorios. Seleccionamos las mejores yerbas de Argentina y las llevamos directo a tu puerta. Envío a todo el país.",
  keywords: [
    "yerba mate",
    "yerba mate premium",
    "mates artesanales",
    "bombillas",
    "yerba argentina",
    "tereré",
    "comprar yerba mate",
    "yerba mate online",
    "accesorios mate",
  ],
  authors: [{ name: "YerbaXanaes" }],
  creator: "YerbaXanaes",
  publisher: "YerbaXanaes",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "YerbaXanaes",
    title: "YerbaXanaes | Yerba Mate Premium Argentina",
    description:
      "Yerba mate premium, mates artesanales y accesorios. Calidad argentina directo a tu mesa.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "YerbaXanaes — Yerba Mate Premium Argentina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YerbaXanaes | Yerba Mate Premium Argentina",
    description:
      "Yerba mate premium, mates artesanales y accesorios. Calidad argentina directo a tu mesa.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-stone-50 text-stone-900`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
