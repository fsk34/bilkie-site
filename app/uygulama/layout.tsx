import type { Metadata } from "next";
import { OturumSaglayici } from "../lib/oturum";
import Kapi from "./Kapi";
import "./uygulama.css";

export const metadata: Metadata = {
  title: "Bilkie | Uygulama",
  description: "Bilkie'yi tarayıcında kullan: konu testleri, XP, seri ve ligler.",
  robots: { index: false, follow: false },
};

export default function UygulamaLayout({ children }: { children: React.ReactNode }) {
  return (
    <OturumSaglayici>
      <Kapi>{children}</Kapi>
    </OturumSaglayici>
  );
}
