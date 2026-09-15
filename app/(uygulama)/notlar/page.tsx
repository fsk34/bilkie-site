import type { Metadata } from "next";
import NotlarSayfasi from "./NotlarSayfasi";

// Kişisel içerik: bot için görülecek bir şey yok
export const metadata: Metadata = { title: "Notlarım | Bilkie", robots: { index: false, follow: true } };

export default function NotlarPage() {
  return <NotlarSayfasi />;
}
