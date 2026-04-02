import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  title: "YerbaXanaes | Yerba Mate Premium",
  description:
    "Descubre nuestra selección de yerba mate premium, mates artesanales y accesorios. Calidad Argentina directo a tu mesa.",
  keywords: ["yerba mate", "mates", "bombillas", "yerba argentina", "tereré"],
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
      </body>
    </html>
  );
}
