import type { Metadata } from "next";
import { OturumSaglayici } from "../lib/oturum";
import Kapi from "./Kapi";
import "./uygulama.css";

export const metadata: Metadata = {
  title: "Bilkie | Öğrenciler için oyunlaştırılmış öğrenme",
  description: "Bilkie'yi tarayıcında kullan: konu testleri, XP, seri ve ligler.",
  // Uygulama artık sitenin KENDİSİ (bilkie.com kökü). Eskiden /uygulama alt yolundayken
  // noindex'ti; öyle kalsa site aramadan tamamen düşerdi.
  robots: { index: true, follow: true },
};

export default function UygulamaLayout({ children }: { children: React.ReactNode }) {
  return (
    <OturumSaglayici>
      <Kapi>{children}</Kapi>
    </OturumSaglayici>
  );
}
