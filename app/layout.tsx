import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/seo";
import FloatingNavbar from "@/components/floating-navbar";
import "./globals.css";

const DESCRIPTION =
  "Real complaints triangulated across Hacker News, GitHub, and StackExchange into evidence-backed build briefs, ready to paste into Claude Code, Cursor, or v0.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sourced · Real complaints, triangulated.",
    template: "%s | Sourced",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Sourced",
    title: "Sourced · Real complaints, triangulated.",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sourced · Real problems, sourced. Ready to build.",
    description: DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export const viewport: Viewport = {
  themeColor: "#5B4FF7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html lang="en">
      <body>
        <FloatingNavbar />
        {children}
        {umamiSrc && umamiWebsiteId && (
          <script defer src={umamiSrc} data-website-id={umamiWebsiteId} />
        )}
      </body>
    </html>
  );
}
