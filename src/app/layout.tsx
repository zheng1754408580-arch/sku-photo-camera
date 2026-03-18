import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "SKU Camera",
  description: "Upload SKU files and automatically name captured photos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SKU Camera",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ee",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} min-h-dvh bg-background font-sans antialiased text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
