import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/feed",
          "/feed/*",
          "/methodology",
          "/rejected",
          "/category",
          "/category/*",
          "/platform/*",
          "/stack/*",
          "/tools/*",
          "/signals",
        ],
        disallow: ["/admin/*", "/api/*", "/account/*"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "Bytespider",
          "CCBot",
          "PerplexityBot",
          "Diffbot",
          "FacebookBot",
          "Amazonbot",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
