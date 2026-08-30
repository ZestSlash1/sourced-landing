import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/feed", "/feed/*", "/methodology", "/rejected"],
      disallow: ["/admin/*", "/api/*", "/account/*"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
