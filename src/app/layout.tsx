import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domain Finder",
  description: "Smart domain name generator and availability checker",
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
