import "./globals.css";

export const metadata = {
  title: "Sourced — Real problems, sourced. Ready to build.",
  description:
    "Sourced hands vibe coders real problems people already complain about — with proof someone will pay for the fix, and a build brief ready to hand straight to Claude Code.",
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
