import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { REKLAM_ISTEMCI } from "./lib/reklam";

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

  // AdSense site doğrulaması — yayıncı kimliği AdMob ile aynı hesaptan
  // (`public/ads.txt` de bu numarayı ilan ediyor). Next.js bunu <head>e
  // <meta name="google-adsense-account" content="…"> olarak basar.
  other: {
    "google-adsense-account": "ca-pub-8784812800014128",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* AdSense yükleyicisi — site doğrulaması ve Otomatik Reklamlar için HER sayfada
            bulunmalı. Reklam birimlerinin kendisi yalnız oyun ekranlarında (bkz.
            app/(uygulama)/oyun/Reklam.tsx); burası sadece betiği yüklüyor.
            ⚠️ Otomatik Reklamlar AdSense panelinden açılırsa Google bu betik sayesinde
            İSTEDİĞİ sayfaya reklam koyabilir — öğrenme ekranlarına reklam istemiyorsak
            panelden o sayfaları hariç tutmak gerekir. */}
        <Script
          id="adsense-yukleyici"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${REKLAM_ISTEMCI}`}
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}