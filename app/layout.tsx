import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Bilkie | Öğrenciler için oyunlaştırılmış öğrenme",
  description:
    "Bilkie, ilkokul ve ortaokul öğrencileri için konu testleri, konu defterleri ve yazılı hazırlık içerikleri sunan oyunlaştırılmış eğitim platformudur.",

  keywords: [
    "eğitim uygulaması",
    "oyunlaştırılmış öğrenme",
    "ilkokul",
    "ortaokul",
    "konu testleri",
    "yazılı hazırlık",
    "bilkie",
  ],

  authors: [{ name: "Bilkie" }],

  // 🔥 EN KRİTİK SEO
  metadataBase: new URL("https://www.bilkie.com"),
  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Bilkie",
    description:
      "Oyunlaştırılmış öğrenme ile ders çalışmayı eğlenceli hale getir.",
    url: "https://www.bilkie.com",
    siteName: "Bilkie",
    images: [
      {
        url: "/og.png", // daha temiz kullanım
        width: 1200,
        height: 630,
      },
    ],
    locale: "tr_TR",
    type: "website",
  },

  // 🔥 GOOGLE + WHATSAPP + TWITTER
  twitter: {
    card: "summary_large_image",
    title: "Bilkie",
    description:
      "Öğrenciler için oyunlaştırılmış öğrenme platformu",
    images: ["/og.png"],
  },

  // 🔥 ROBOTS (SEO için önemli)
  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
  },
};