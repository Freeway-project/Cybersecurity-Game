import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cryptography Mission Pilot",
  description:
    "A modular browser-based pilot for cryptography education research and study instrumentation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
