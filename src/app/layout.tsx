import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { CrossTabSignOutListener } from "@/components/features/auth/cross-tab-sign-out";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "InsightHub — AI-Powered Research Intelligence",
    template: "%s | InsightHub",
  },
  description:
    "Transform unstructured documents into a queryable, cited knowledge base powered by RAG.",
  openGraph: {
    siteName: "InsightHub",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SessionProvider>
          <CrossTabSignOutListener />
          {children}
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
