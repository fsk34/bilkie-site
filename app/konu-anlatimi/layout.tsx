// Konu anlatımı bölümünün kabuğu.
//
// `(uygulama)` ROTA GRUBUNUN DIŞINDA olması bilinçli: oradaki Kapi.tsx giriş
// yapmamış herkesi /giris'e atıyor. Bu sayfaların tamamı halka açık ve sunucuda
// çiziliyor — arama motorunun görmesi gereken içerik burada.

import type { Metadata } from "next";
import "../(uygulama)/uygulama.css";
import AltBant from "../(uygulama)/AltBant";
import Ust from "./Ust";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function KonuAnlatimiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bk bk-ia">
      <Ust />
      <main className="bk-ia-govde">{children}</main>
      <AltBant dersler={false} />
    </div>
  );
}
