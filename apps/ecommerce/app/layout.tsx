import type { Metadata } from "next";
import { Source_Sans_3, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "@/components/providers";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

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
      "Yerba mate premium desde Villa del Rosario, Córdoba. Envíos a todo el país.",
  },
  twitter: {
    card: "summary_large_image",
    title: "YerbaXanaes | Yerba Mate Premium Argentina",
    description:
      "Yerba mate premium desde Villa del Rosario, Córdoba. Envíos a todo el país.",
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
        className={`${sourceSans.variable} ${playfair.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
