import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const DESCRIPTION =
  "Sourced hands vibe coders real problems people already complain about — with proof someone will pay for the fix, and a build brief ready to hand straight to Claude Code.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sourced — Real problems, sourced. Ready to build.",
    template: "%s | Sourced",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Sourced",
    title: "Sourced — Real problems, sourced. Ready to build.",
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
