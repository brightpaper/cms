import type { Metadata, Viewport } from "next";
import { Bitter, Inter } from "next/font/google";

import { APP_CONFIG } from "@/config/app";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The logo wordmark is a bold bracketed serif, unlike the Inter used for UI.
 * Loaded at 700 only, and applied solely to the lock-up.
 */
const bitter = Bitter({
  variable: "--font-wordmark-serif",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s · ${APP_CONFIG.shortName}`,
  },
  description: APP_CONFIG.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bitter.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
