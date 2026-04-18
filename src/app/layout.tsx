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

export const metadata: Metadata = {
  title: "InsightHub — AI Research Intelligence",
  description:
    "Transform unstructured documents into a queryable, cited knowledge base powered by RAG.",
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
