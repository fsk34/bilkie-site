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

export const metadata = {
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
    "bilkie"
  ],
  authors: [{ name: "Bilkie" }],
  openGraph: {
    title: "Bilkie",
    description:
      "Oyunlaştırılmış öğrenme ile ders çalışmayı eğlenceli hale getir.",
    url: "https://bilkie.com",
    siteName: "Bilkie",
    images: [
      {
        url: "https://bilkie.com/og.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "tr_TR",
    type: "website",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
