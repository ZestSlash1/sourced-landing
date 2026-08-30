import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const DESCRIPTION =
  "Real complaints triangulated across platforms into evidence-backed build briefs for Claude Code, Cursor, and v0.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sourced — Real complaints, triangulated.",
    template: "%s | Sourced",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Sourced",
    title: "Sourced — Real complaints, triangulated.",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sourced — Real problems, sourced. Ready to build.",
    description: DESCRIPTION,
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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
