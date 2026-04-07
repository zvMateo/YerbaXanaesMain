import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://yerbaxanaes.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/checkout/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
